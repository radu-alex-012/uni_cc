require('dotenv').config();
const jwt = require('jsonwebtoken');
const createPool = require('./database.js');
const pool = createPool('wot_wiki');
const secretKey = process.env.SECRET_KEY;
const express = require('express');
const app = express();
const PORT = 3002;
const authenticateToken = (req, res, next) => {
    const authenticationHeader = req.headers['authorization'];
    if (!authenticationHeader || !authenticationHeader.startsWith('Bearer ')) {
        return res.sendStatus(401);
    }

    const token = authenticationHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, secretKey, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }

        req.user = user;
        next();
    });
};

async function queryDatabase(sql, params = []) {
    const connection = await (await pool).getConnection();
    try {
        const [rows, fields] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();
    }
}
function buildCommentTree(rawCommentsList, parentId = -1) {
    const commentTree = [];
    const children = rawCommentsList.filter(comment => comment.parent_comment_id === parentId);

    for (const child of children) {
        const comment = {
            id: child.id,
            userId: (child.user_id === NULL ? '[deleted]' : child.user_id),
            content: (child.is_deleted === true ? '[deleted]' : child.content),
            createdAt: child.created_at,
            updatedAt: child.updated_at,
            children: buildCommentTree(rawCommentsList, child.id)
        };
        commentTree.push(comment);
    }
    return commentTree;
}

app.use(express.json());

app.get('/tanks/:tankAlias', authenticateToken, async (req, res) => {
    try {
        let results = await queryDatabase('SELECT * FROM comments WHERE tank_id = (SELECT id FROM tanks WHERE alias = ?)', [req.params.tankAlias]);
        res.json(buildCommentTree(results));
    }
    catch (error) {
        console.error('Error fetching comments for tank alias ' + req.params.tankAlias + ': ' + error);
        res.sendStatus(500);
    }
});

app.post('/tanks/:tankAlias', authenticateToken, async (req, res) => {
    const parentCommentId = req.data.parentCommentId;
    const userId = req.data.userId;
    const tankId = req.data.tankId;
    const content = req.data.content;
    try {
        let results = await queryDatabase('INSERT INTO comments (parent_comment_id, user_id, tank_id, content) VALUES (?, ?, ?, ?)', [parentCommentId, userId, tankId, content]);
        res.status(201).header('Location', '/tanks/' + req.params.tankAlias + '/' + results.insertId);
    }
    catch (error) {
        console.error('Error posting comment with userId = ' + userId + ' and tankId = ' + tankId + ': ' + error);
        res.sendStatus(500);
    }
});

app.put('/tanks/:tankAlias', authenticateToken, async (req, res) => {
    const id = req.data.id;
    const newContent = req.data.content;

    try {
        await queryDatabase('UPDATE comments SET content = ? WHERE id = ?', [newContent, id]);
        res.sendStatus(204);
    }
    catch (error) {
        console.error('Error updating comment with id ' + id + ': ' + error);
        res.sendStatus(500);
    }
});

app.delete('/tanks/:tankAlias/:id', authenticateToken   , async (req, res) => {
    const id = req.params.id;

    try {
        await queryDatabase('DELETE FROM comments WHERE id = ?', [id]);
        res.sendStatus(200);
    }
    catch (error) {
        console.error('Error deleting comment with id ' + id + ': ' + error);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`WOT Wiki comments API server is running at port ${PORT}`);
});