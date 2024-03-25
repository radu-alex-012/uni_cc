require('dotenv').config();
const jwt = require('jsonwebtoken');
const createPool = require('./database.js');
const pool = createPool('wot_wiki');
const secretKey = process.env.SECRET_KEY;
const apiSecretKey = process.env.API_SECRET_KEY;
const wgApplicationId = process.env.APPLICATION_ID;
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;
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

function unixTimestampToMySQL(unixTimestamp) {
    const date = new Date(unixTimestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function queryDatabase(sql, params = []) {
    const connection = await (await pool).getConnection();
    try {
        const [rows, fields] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();
    }
}

async function getCurrentAccessToken() {
    const rows = await queryDatabase('SELECT access_token, expires_at FROM wgapi LIMIT 1');
    return rows[0];
}

async function updateAccessToken(newAccessToken, newExpiresAt) {
    await queryDatabase('DELETE FROM wgapi');
    await queryDatabase('INSERT INTO wgapi (access_token, expires_at) VALUES (?, ?)', [newAccessToken, newExpiresAt]);
}

async function fetchAndUpdateAccessToken(currentAccessToken) {
    try {
        const response = await axios.post('https://api.worldoftanks.eu/wot/auth/prolongate/', {
            params: {
                application_id: wgApplicationId,
                access_token: currentAccessToken
            }
        });
        const newAccessToken = response.data.data.access_token;
        const newExpiresAt = response.data.data.expires_at;
        await updateAccessToken(newAccessToken, newExpiresAt);
    } catch (error) {
        console.error('Error updating access token:', error.message);
    }
}

async function updateAccessTokenRoutine() {
    try {
        const {access_token: currentAccessToken, expires_at: currentExpiresAt} = await getCurrentAccessToken();
        const remainingTime = currentExpiresAt * 1000 - Date.now();
        const thresholdTime = 30 * 60 * 1000;

        if (remainingTime <= thresholdTime) {
            await fetchAndUpdateAccessToken(currentAccessToken);
        }
    } catch (error) {
        console.error('Error updating access token:', error.message);
    }
}

setInterval(updateAccessTokenRoutine, 15 * 60 * 1000);

app.use(express.json());

app.get('/users/:id', authenticateToken, async (req, res) => {
    let results = await queryDatabase('SELECT name FROM users WHERE id = ?', [req.params.id]);
    if (results && results.length > 0) {
        const username = results[0].name;
        try {
            let response = await axios.get('https://api.worldoftanks.eu/wot/account/list/', {
                params: {
                    application_id: wgApplicationId,
                    search: username,
                    type: "exact"
                }
            });
            if (response.data.meta.count === 1) {
                const accountId = response.data.data[0].account_id;
                const currentAccessTokenObject = await getCurrentAccessToken();
                const accessToken = currentAccessTokenObject.access_token;
                response = await axios.get('https://api.worldoftanks.eu/wot/account/info/', {
                    params: {
                        application_id: wgApplicationId,
                        account_id: accountId,
                        access_token: accessToken,
                        extra: 'private.garage, statistics.random'
                    }
                });
                res.json(response.data.data[accountId]);
            }
        } catch (error) {
            console.error('Error fetching player\'s general stats:', error.message);
        }
    } else {
        console.log('No user found with ID', userId);
        res.sendStatus(404);
    }
});

app.post('/register', async (req, res) => {
    const {username, email, password} = req.body;

    try {
        const rights = `${['r', 'c'].join(',')}`;
        let results = await queryDatabase('SELECT 1 FROM users WHERE name = ?', [username]);
        if (results.length > 0) {
            return res.sendStatus(409).json({reason: 'A user with the same name already exists'});
        }
        results = queryDatabase('SELECT 1 FROM users WHERE email = ?', [email]);
        if (results.length > 0) {
            return res.sendStatus(409).json({reason: 'A user with the same email address already exists'});
        }
        results = await queryDatabase('INSERT INTO users (name, email, password, rights) VALUES (?, ?, ?, ?)', [username, email, password, rights]);
        const userId = results.insertId;
        const token = jwt.sign({userId}, secretKey, {expiresIn: '1h'});
        const userUri = `/users/${userId}`;
        res.status(201).header('Location', userUri).json({userId, token});
    } catch (error) {
        console.error('Error registering user: ', error);
        res.sendStatus(500);
    }
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;

    let results = await queryDatabase('SELECT id, name, rights, ban_type, ban_date, ban_reason FROM users WHERE email = ? AND password = ?', [email, password]);
    if (results.length === 0) {
        return res.sendStatus(401);
    }
    if (results[0].ban_type.split(',').includes('r')) {
        const banDate = results[0].ban_date;
        const banReason = results[0].ban_reason;
        return res.status(403).json({banDate, banReason});
    }

    const userInfo = results[0];
    const token = jwt.sign({userId: userInfo.userId, username: userInfo.name}, secretKey, {expiresIn: '1h'});
    res.status(201).header('Location', '/tanks').json({token});
});

app.get('/tanks/:tankAlias?', authenticateToken, async (req, res) => {
    const authenticationHeader = req.headers['authorization'];
    const jwtToken = authenticationHeader.split(' ')[1];
    const userId = jwt.decode(jwtToken).userId;

    await axios.get('http://localhost:3001/wot/wiki/tanks' + (req.params.tankAlias !== undefined ? `/${req.params.tankAlias}` : ''), {
        headers: {
            'Authorization': 'Bearer ' + jwt.sign({userId}, apiSecretKey, {expiresIn: '1h'})
        }
    })
        .then(response => {
            res.json(response.data);
        })
        .catch(error => {
            console.error('Error fetching data from Tankopedia API: ', error);
            res.sendStatus(500);
        });
});

app.get('/tanks/:tankAlias/comments', authenticateToken, async (req, res) => {
    const authenticationHeader = req.headers['authorization'];
    const jwtToken = authenticationHeader.split(' ')[1];
    const userId = jwt.decode(jwtToken).userId;

    await axios.get(`http://localhost:3002/wot/wiki/tanks/${req.params.tankAlias}`, {
        headers: {
            'Authorization': 'Bearer ' + jwt.sign({userId}, apiSecretKey, {expiresIn: '1h'})
        }
    })
        .then(response => {
            res.json(response.data);
        })
        .catch(error => {
            console.error('Error fetching data from comments API: ', error);
            res.sendStatus(500);
        });
});

app.post('/tanks/:tankAlias/comments', authenticateToken, async (req, res) => {
    const authenticationHeader = req.headers['authorization'];
    const jwtToken = authenticationHeader.split(' ')[1];
    const userId = jwt.decode(jwtToken).userId;

    await axios.post(`http://localhost:3002/wot/wiki/tanks/${req.params.tankAlias}`, {
        parentCommentId: req.data.parentCommentId,
        userId: req.data.userId,
        tankId: req.data.tankId,
        content: req.data.content
    }, {
        headers: {
            'Authorization': 'Bearer ' + jwt.sign({userId}, apiSecretKey, {expiresIn: '1h'}),
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            res.sendStatus(response.status);
        })
        .catch(error => {
            console.error('Error posting comment with comments API: ', error);
            res.sendStatus(500);
        });
});

app.put('/tanks/:tankAlias/comments', authenticateToken, async (req, res) => {
    const authenticationHeader = req.headers['authorization'];
    const jwtToken = authenticationHeader.split(' ')[1];
    const userId = jwt.decode(jwtToken).userId;

    await axios.put(`http://localhost:3002/wot/wiki/tanks/${req.params.tankAlias}`, {
        id: req.data.id,
        content: req.data.content
    }, {
        headers: {
            'Authorization': 'Bearer ' + jwt.sign({userId}, apiSecretKey, {expiresIn: '1h'}),
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            res.sendStatus(response.status);
        })
        .catch(error => {
            console.error('Error updating comment with comments API: ', error);
            res.sendStatus(500);
        });
});

app.delete('/tanks/:tankAlias/comments/:id', authenticateToken, async (req, res) => {
    const authenticationHeader = req.headers['authorization'];
    const jwtToken = authenticationHeader.split(' ')[1];
    const userId = jwt.decode(jwtToken).userId;

    await axios.delete(`http://localhost:3002/wot/wiki/tanks/${req.params.tankAlias}/${req.params.id}`, {
        headers: {
            'Authorization': 'Bearer ' + jwt.sign({userId}, apiSecretKey, {expiresIn: '1h'}),
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            res.sendStatus(response.status);
        })
        .catch(error => {
            console.error('Error deleting comment with comments API: ', error);
            res.sendStatus(500);
        });
});

app.get('/tanks/:tankAlias/stats', authenticateToken, async (req, res) => {
    const authenticationHeader = req.headers['authorization'];
    const jwtToken = authenticationHeader.split(' ')[1];
    const userId = jwt.decode(jwtToken).userId;
    let results = await queryDatabase('SELECT name FROM users WHERE id = ?', [userId]);
    if (results && results.length > 0) {
        const username = results[0].name;
        try {
            let response = await axios.get('https://api.worldoftanks.eu/wot/account/list/', {
                params: {
                    application_id: wgApplicationId,
                    search: username,
                    type: "exact"
                }
            });
            if (response.data.meta.count === 1) {
                const accountId = response.data.data[0].account_id;
                let results = await queryDatabase('SELECT tank_id FROM tanks WHERE alias = ?', [req.params.tankAlias]);
                const tankId = results[0].tank_id;
                response = await axios.get('https://api.worldoftanks.eu/wot/account/tanks/', {
                    params: {
                        application_id: wgApplicationId,
                        account_id: accountId,
                        tank_id: tankId
                    }
                });
                if (Object.keys(response.data.data[accountId]).length === 0) {
                    res.json({
                        battles: 0,
                        wins: 0,
                        mark_of_mastery: 0
                    });
                } else {
                    res.json({
                        battles: response.data.data[accountId][0].statistics.battles,
                        wins: response.data.data[accountId][0].statistics.wins,
                        mark_of_mastery: response.data.data[accountId][0].mark_of_mastery
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching player\'s tank stats:', error.message);
        }
    } else {
        console.log('No user found with ID', userId);
        res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`WOT Wiki server is running at port ${PORT}`);
});