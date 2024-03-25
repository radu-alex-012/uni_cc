const http = require('http');
const createDatabaseConnection = require('./database.js');
const {
    getAllStats,
    getFirepowerStats,
    getSurvivabilityStats,
    getMobilityStats,
    getSpottingStats
} = require('./get-stats.js');
const url = require('url');
const PORT = 3001;

async function tankExists(db, isId, identifier) {
    const sql = `SELECT 1
                 FROM tanks
                 WHERE ` + (isId ? `id` : `alias`) + ` = ?`;
    const result = await db.query(sql, [identifier]);
    return result.length > 0;
}

async function nationExists(db, isId, identifier) {
    const sql = `SELECT 1
                 FROM nations
                 WHERE ` + (isId ? `id` : `alias`) + ` = ?`;
    const result = await db.query(sql, [identifier]);
    return result.length > 0;
}

function isId(str) {
    return /^\d+$/.test(str) && parseInt(str, 10) > 0;
}

function isAlias(str) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(str);
}

function compareJSONStructure(template, object) {
    if (typeof template !== 'object' || typeof object !== 'object') {
        return false;
    }

    const templateKeys = Object.keys(template);
    const objectKeys = Object.keys(object);

    if (templateKeys.length !== objectKeys.length) {
        return false;
    }

    for (const key of templateKeys) {
        if (!objectKeys.includes(key)) {
            return false;
        }
    }

    for (const key of templateKeys) {
        const templateValue = template[key];
        const actualValue = object[key];

        if (typeof templateValue === 'object') {
            if (!compareJSONStructure(templateValue, actualValue)) {
                return false;
            }
        } else {
            if (Array.isArray(templateValue)) {
                if (!templateValue.includes(actualValue)) {
                    return false;
                }
            } else if (templateValue === 'positiveInteger') {
                if (!Number.isInteger(actualValue) || actualValue <= 0) {
                    return false;
                }
            } else if (templateValue === 'positiveFloat') {
                if (typeof actualValue !== 'number' || actualValue <= 0) {
                    return false;
                }
            } else if (templateValue === 'undefinedOrPositiveInteger') {
                if (actualValue !== undefined && (!Number.isInteger(actualValue) || actualValue <= 0)) {
                    return false;
                }
            } else if (templateValue === 'undefinedOrPositiveFloat') {
                if (actualValue !== undefined && (typeof actualValue !== 'number' || actualValue <= 0)) {
                    return false;
                }
            }
        }
    }

    return true;
}

function validateJSON(json, type, db) {
    const Tier = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const TankClass = ['LT', 'MT', 'HT', 'TD', 'SPG'];
    let expectedFields;
    if (type === 'nation') {
        expectedFields = {
            alias: 'string',
            fullName: 'string'
        };
    } else if (type === 'tank') {
        expectedFields = {
            nationAlias: 'string',
            alias: 'string',
            fullName: 'string'
        };
    } else if (type === 'firepower') {
        const template = {
            shell1: {
                type: ['AP', 'APCR', 'HEAT', 'HE_STUN'],
                damage: 'positiveInteger',
                penetration: {
                    value: 'positiveInteger',
                    unit: 'mm'
                },
                velocity: {
                    value: 'positiveInteger',
                    unit: 'm/s'
                }
            },
            shell2: {
                type: ['APCR', 'HEAT', 'HESH', 'AP', 'HE'],
                damage: 'positiveInteger',
                penetration: {
                    value: 'positiveInteger',
                    unit: 'mm'
                },
                velocity: {
                    value: 'positiveInteger',
                    unit: 'm/s'
                }
            },
            shell3: {
                type: ['HE', 'AP', 'HESH', undefined],
                damage: 'undefinedOrPositiveInteger',
                penetration: {
                    value: 'undefinedOrPositiveInteger',
                    unit: 'mm'
                },
                velocity: {
                    value: 'undefinedOrPositiveInteger',
                    unit: 'm/s'
                }
            },
            stun: {
                min: {
                    value: 'undefinedOrPositiveFloat',
                    unit: 's'
                },
                max: {
                    value: 'undefinedOrPositiveFloat',
                    unit: 's'
                }
            },
            reloadTime: {
                value: 'positiveFloat',
                unit: 's'
            },
            clip: {
                size: 'undefinedOrPositiveInteger',
                burstSize: 'undefinedOrPositiveInteger',
                intraClipReload: {
                    value: 'undefinedOrPositiveFloat',
                    unit: 's'
                }
            },
            rof: 'positiveFloat',
            dpm: 'positiveFloat',
            aimTime: {
                value: 'positiveFloat',
                unit: 's'
            },
            dispersion: {
                value: 'positiveFloat',
                unit: 'm'
            },
            ammoCapacity: 'positiveInteger'
        };
        if (!compareJSONStructure(template, json)) {
            return 'Your request should contain a JSON object with the following structure: {\n' +
                '            shell1: {\n' +
                '                type: [\'AP\', \'APCR\', \'HEAT\', \'HE_STUN\'],\n' +
                '                damage: \'positiveInteger\',\n' +
                '                penetration: {\n' +
                '                    value: \'positiveInteger\',\n' +
                '                    unit: \'mm\'\n' +
                '                },\n' +
                '                velocity: {\n' +
                '                    value: \'positiveInteger\',\n' +
                '                    unit: \'m/s\'\n' +
                '                }\n' +
                '            },\n' +
                '            shell2: {\n' +
                '                type: [\'APCR\', \'HEAT\', \'HESH\', \'AP\', \'HE\'],\n' +
                '                damage: \'positiveInteger\',\n' +
                '                penetration: {\n' +
                '                    value: \'positiveInteger\',\n' +
                '                    unit: \'mm\'\n' +
                '                },\n' +
                '                velocity: {\n' +
                '                    value: \'positiveInteger\',\n' +
                '                    unit: \'m/s\'\n' +
                '                }\n' +
                '            },\n' +
                '            shell3: {\n' +
                '                type: [\'HE\', \'AP\', \'HESH\', undefined],\n' +
                '                damage: \'undefinedOrPositiveInteger\',\n' +
                '                penetration: {\n' +
                '                    value: \'undefinedOrPositiveInteger\',\n' +
                '                    unit: \'mm\'\n' +
                '                },\n' +
                '                velocity: {\n' +
                '                    value: \'undefinedOrPositiveInteger\',\n' +
                '                    unit: \'m/s\'\n' +
                '                }\n' +
                '            },\n' +
                '            stun: {\n' +
                '                min: {\n' +
                '                    value: \'undefinedOrPositiveFloat\',\n' +
                '                    unit: \'s\'\n' +
                '                },\n' +
                '                max: {\n' +
                '                    value: \'undefinedOrPositiveFloat\',\n' +
                '                    unit: \'s\'\n' +
                '                }\n' +
                '            },\n' +
                '            reloadTime: {\n' +
                '                value: \'positiveFloat\',\n' +
                '                unit: \'s\'\n' +
                '            },\n' +
                '            clip: {\n' +
                '                size: \'undefinedOrPositiveInteger\',\n' +
                '                burstSize: \'undefinedOrPositiveInteger\',\n' +
                '                intraClipReload: {\n' +
                '                    value: \'undefinedOrPositiveFloat\',\n' +
                '                    unit: \'s\'\n' +
                '                }\n' +
                '            },\n' +
                '            rof: \'positiveFloat\',\n' +
                '            dpm: \'positiveFloat\',\n' +
                '            aimTime: {\n' +
                '                value: \'positiveFloat\',\n' +
                '                unit: \'s\'\n' +
                '            },\n' +
                '            dispersion: {\n' +
                '                value: \'positiveFloat\',\n' +
                '                unit: \'m\'\n' +
                '            },\n' +
                '            ammoCapacity: \'positiveInteger\'\n' +
                '        }';
        }
        return '';
    }

    let missingFields = [];
    for (const field of Object.keys(expectedFields)) {
        if (!(field in json)) {
            missingFields.push(field);
        }
    }
    if (missingFields.length !== 0) {
        return 'Field' + (missingFields.length === 1 ? '' : 's') + ' ' + missingFields.join(', ') + ' ' + (missingFields.length === 1 ? 'is' : 'are') + ' missing';
    }

    let errorMessage = '';
    for (const [field, type] of Object.entries(expectedFields)) {
        if (typeof json[field] !== type) {
            errorMessage += `${field} should be a string, `;
        }
    }
    if (type === 'tank') {
        if (!nationExists(db, false, json.nationAlias)) {
            errorMessage += 'no nation with the \'' + json.nationAlias + '\' alias exists, ';
        }
        if (!Tier.includes(json['tier'])) {
            errorMessage += 'tier should be a numeral from I, II, III, IV, V, VI, VII, VIII, IX, X, ';
        }
        if (!TankClass.includes(json['class'])) {
            errorMessage += 'class should be a literal from LT, MT, HT, TD, SPG, ';
        }
    }
    if (errorMessage.length !== 0) {
        errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
        errorMessage = errorMessage.slice(0, -2);
        return errorMessage;
    }
    return '';
}

const server = http.createServer(async (req, res) => {
    const {pathname} = new URL(req.url, `http://${req.headers.host}`);
    const parsedUrl = url.parse(req.url, true);
    const pathWithoutLeadingSlash = parsedUrl.pathname.slice(1);
    const pathChunks = pathWithoutLeadingSlash.split('/');
    const db =  createDatabaseConnection('wot_wiki');

    if (pathname.startsWith('/wot/wiki/')) {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('error', (error) => {
            console.error('An error occurred:', error);
        });
        if (req.method === 'GET') {
            if (pathname.endsWith('nations')) {
                try {
                    const [dbResults, dbFields] = await db.query(`SELECT name
                                                                  FROM nations`);
                    const nations = dbResults.map(row => row.name);
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(nations, null, 2));
                } catch (error) {
                    console.error(error);
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end('Internal Server Error');
                }
            } else if (pathname.endsWith('tanks')) {
                try {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(await getAllStats(db), null, 2));
                } catch (error) {
                    console.error(error);
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end('Internal Server Error');
                }
            } else if (pathChunks[2] === 'tanks' && isId(pathChunks[3]) && await tankExists(db, true, pathChunks[3])) {
                if (pathChunks.length === 4) {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getAllStats(db, true, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'firepower') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getFirepowerStats(db, true, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'survivability') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSurvivabilityStats(db, true, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'mobility') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getMobilityStats(db, true, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'spotting') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSpottingStats(db, true, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('Not Found');
                }
            } else if (pathChunks[2] === 'tanks' && isAlias(pathChunks[3]) && await tankExists(db, false, pathChunks[3])) {
                if (pathChunks.length === 4) {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getAllStats(db, false, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'firepower') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getFirepowerStats(db, false, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'survivability') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSurvivabilityStats(db, false, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'mobility') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getMobilityStats(db, false, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'spotting') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSpottingStats(db, false, false, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('Not Found');
                }
            } else if (pathChunks[2] === 'nations' && isId(pathChunks[3]) && await nationExists(db, true, pathChunks[3])) {
                if (pathChunks.length === 4) {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getAllStats(db, true, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'firepower') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getFirepowerStats(db, true, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'survivability') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSurvivabilityStats(db, true, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'mobility') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getMobilityStats(db, true, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'spotting') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSpottingStats(db, true, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('Not Found');
                }
            } else if (pathChunks[2] === 'nations' && isAlias(pathChunks[3]) && await nationExists(db, false, pathChunks[3])) {
                if (pathChunks.length === 4) {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getAllStats(db, false, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'firepower') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getFirepowerStats(db, false, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'survivability') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSurvivabilityStats(db, false, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'mobility') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getMobilityStats(db, false, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else if (pathChunks.length === 5 && pathChunks[4] === 'spotting') {
                    try {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(await getSpottingStats(db, false, true, pathChunks[3]), null, 2));
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('Not Found');
                }
            } else {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('Not Found');
            }
        } else if (req.method === 'POST') {
            if (pathname.endsWith('nations')) {
                req.on('end', async () => {
                    try {
                        const json = JSON.parse(data);
                        const errorMessage = validateJSON(json, 'nation', db);
                        if (errorMessage === '') {
                            try {
                                const [result] = await db.query(`INSERT INTO nations (alias, name) VALUE (?, ?)`, [json.alias, json.fullName]);
                                const newLocation = 'http://localhost:3000/wot/wiki/nations/' + result.insertId;
                                res.writeHead(201, {
                                    'Content-Type': 'application/json',
                                    'Location': newLocation
                                });
                                res.end(JSON.stringify({
                                    'message': 'Resource created successfully'
                                }));
                            } catch (error) {
                                console.error(error);
                                res.writeHead(500, {'Content-Type': 'text/plain'});
                                res.end('Internal Server Error');
                            }
                        } else {
                            res.writeHead(400, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify({
                                'error': 'Bad Request',
                                'reason': errorMessage
                            }));
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        res.writeHead(400, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({
                            'error': 'Bad Request',
                            'reason': 'Couldn\'t process JSON'
                        }));
                    }
                });
            } else if (pathname.endsWith('tanks')) {
                req.on('end', async () => {
                    try {
                        const json = JSON.parse(data);
                        const errorMessage = validateJSON(json, 'tank', db);
                        if (errorMessage === '') {
                            try {
                                const [result] = await db.query(`INSERT INTO tanks (nation_id, alias, name, tier, class) VALUE ((SELECT id FROM nations WHERE alias = ?), ?, ?, ?, ?)`, [json.nationAlias, json.alias, json.fullName, json.tier, json.class]);
                                const newLocation = 'http://localhost:3000/wot/wiki/tanks/' + result.insertId;
                                res.writeHead(201, {
                                    'Content-Type': 'application/json',
                                    'Location': newLocation
                                });
                                res.end(JSON.stringify({
                                    'message': 'Resource created successfully'
                                }));
                            } catch (error) {
                                console.error(error);
                                res.writeHead(500, {'Content-Type': 'text/plain'});
                                res.end('Internal Server Error');
                            }
                        } else {
                            res.writeHead(400, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify({
                                'error': 'Bad Request',
                                'reason': errorMessage
                            }));
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        res.writeHead(400, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({
                            'error': 'Bad Request',
                            'reason': 'Couldn\'t process JSON'
                        }));
                    }
                });
            } else if (pathChunks[2] === 'tanks' && isId(pathChunks[3]) && await tankExists(db, true, pathChunks[3])) {
                if (pathChunks.length === 4) {
                    res.writeHead(409, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({
                        'error': 'Resource Conflict',
                        'reason': 'The resource already exists'
                    }));
                } else if (pathChunks.length === 5 && pathChunks[4] === 'firepower') {
                    req.on('end', async () => {
                        try {
                            const json = JSON.parse(data);
                            const errorMessage = validateFirepowerJSON(json);
                            if (errorMessage === '') {
                                try {
                                    const [result] = await db.query(`INSERT INTO firepower
                                                                     VALUES (NULL,
                                                                             (SELECT id FROM tanks WHERE alias = ?), ?,
                                                                             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                                                                             ?, ?, ?, ?, ?,
                                                                             ?)`, [json.shell1.type, json.shell2.type, json.shell3.type, json.shell1.damage, json.shell2.damage, json.shell3.damage, json.shell1.penetration, json.shell2.penetration, json.shell3.penetration, json.shell1.velocity, json.shell2.velocity, json.shell3.velocity, undefined, undefined, json.reloadTime, undefined, undefined, undefined, json.aimTime, json.dispersion, json.ammoCapacity]);
                                    const newLocation = 'http://localhost:3000/wot/wiki/tanks/' + pathChunks[3] + '/firepower/' + result.insertId;
                                    res.writeHead(201, {
                                        'Content-Type': 'application/json',
                                        'Location': newLocation
                                    });
                                    res.end(JSON.stringify({
                                        'message': 'Resource created successfully'
                                    }));
                                } catch (error) {
                                    console.error(error);
                                    res.writeHead(500, {'Content-Type': 'text/plain'});
                                    res.end('Internal Server Error');
                                }
                            } else {
                                res.writeHead(400, {'Content-Type': 'application/json'});
                                res.end(JSON.stringify({
                                    'error': 'Bad Request',
                                    'reason': errorMessage
                                }));
                            }
                        } catch (error) {
                            console.error('Error parsing JSON:', error);
                            res.writeHead(400, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify({
                                'error': 'Bad Request',
                                'reason': 'Couldn\'t process JSON'
                            }));
                        }
                    });
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end('Not Found');
                }
            } else if (pathChunks[2] === 'nations' && isId(pathChunks[3]) && await nationExists(db, true, pathChunks[3])) {
                res.writeHead(409, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({
                    'error': 'Resource Conflict',
                    'reason': 'The resource already exists'
                }));
            } else {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('Not Found');
            }
        } else if (req.method === 'PUT') {
            if (pathname.endsWith('nations') || pathname.endsWith('tanks')) {
                res.writeHead(405, {
                    'Allow': 'GET, POST',
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    "error": "Method Not Allowed",
                    "reason": "PUT method is not supported for the entire collection. Use individual resource endpoints for updates"
                }));
            } else if (pathChunks[2] === 'tanks' && isId(pathChunks[3]) && await tankExists(db, true, pathChunks[3])) {
                req.on('end', async () => {
                    try {
                        const json = JSON.parse(data);
                        const errorMessage = validateJSON(json, 'tank', db);
                        if (errorMessage === '') {
                            try {
                                await db.query(`UPDATE tanks
                                                SET nation_id = (SELECT id FROM nations WHERE alias = ?),
                                                    alias     = ?,
                                                    name      = ?,
                                                    tier      = ?,
                                                    class     = ?
                                                WHERE id = ?`, [json.nationAlias, json.alias, json.fullName, json.tier, json.class, pathChunks[3]]);
                                res.writeHead(204);
                                res.end();
                            } catch (error) {
                                console.error(error);
                                res.writeHead(500, {'Content-Type': 'text/plain'});
                                res.end('Internal Server Error');
                            }
                        } else {
                            res.writeHead(400, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify({
                                'error': 'Bad Request',
                                'reason': errorMessage
                            }));
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        res.writeHead(400, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({
                            'error': 'Bad Request',
                            'reason': 'Couldn\'t process JSON'
                        }));
                    }
                });
            } else if (pathChunks[2] === 'nations' && isId(pathChunks[3]) && await nationExists(db, true, pathChunks[3])) {
                req.on('end', async () => {
                    try {
                        const json = JSON.parse(data);
                        const errorMessage = validateJSON(json, 'nation', db);
                        if (errorMessage === '') {
                            try {
                                await db.query(`UPDATE nations
                                                SET alias = ?,
                                                    name  = ?
                                                WHERE id = ?`, [json.alias, json.fullName, pathChunks[3]]);
                                res.writeHead(204);
                                res.end();
                            } catch (error) {
                                console.error(error);
                                res.writeHead(500, {'Content-Type': 'text/plain'});
                                res.end('Internal Server Error');
                            }
                        } else {
                            res.writeHead(400, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify({
                                'error': 'Bad Request',
                                'reason': errorMessage
                            }));
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        res.writeHead(400, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({
                            'error': 'Bad Request',
                            'reason': 'Couldn\'t process JSON'
                        }));
                    }
                });
            } else {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('Not Found');
            }
        } else if (req.method === 'DELETE') {
            if (pathname.endsWith('nations') || pathname.endsWith('tanks')) {
                res.writeHead(405, {
                    'Allow': 'GET, POST',
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    "error": "Method Not Allowed",
                    "reason": "DELETE method is not supported for the entire collection. Use individual resource endpoints for updates"
                }));
            } else if (pathChunks[2] === 'tanks' && isId(pathChunks[3]) && await tankExists(db, true, pathChunks[3])) {
                req.on('end', async () => {
                    try {
                        await db.query(`DELETE
                                        FROM tanks
                                        WHERE id = ?`, [pathChunks[3]]);
                        res.writeHead(204);
                        res.end();
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                });
            } else if (pathChunks[2] === 'nations' && isId(pathChunks[3]) && await nationExists(db, true, pathChunks[3])) {
                req.on('end', async () => {
                    try {
                        const results = await db.query(`DELETE
                                                        FROM nations
                                                        WHERE id = ?`, [pathChunks[3]]);
                        res.writeHead(204);
                        res.end();
                    } catch (error) {
                        console.error(error);
                        res.writeHead(500, {'Content-Type': 'text/plain'});
                        res.end('Internal Server Error');
                    }
                });
            } else {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('Not Found');
            }
        } else {
            res.writeHead(405, {'Content-Type': 'text/plain'});
            res.end('Method Not Allowed');
        }
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Tankopedia API server runs at port ${PORT}`)
});