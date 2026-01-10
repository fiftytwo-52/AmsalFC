const fs = require('fs');
const path = require('path');

const MEMBERS_FILE = path.join(__dirname, '../../data/members.json');

function readData(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return [];
    }
}

function writeData(filePath, data) {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        if (event.httpMethod === 'GET') {
            const members = readData(MEMBERS_FILE);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(members)
            };
        }

        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { name, position, jerseyNo, age, address, height, preferredFoot, imageUrl, status, notes } = body;

            if (!name || !position) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Name and Position are required' })
                };
            }

            const members = readData(MEMBERS_FILE);

            // Check for duplicate jersey numbers
            if (jerseyNo) {
                const duplicate = members.find(m => m.jerseyNo === jerseyNo);
                if (duplicate) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: `Jersey number ${jerseyNo} is already taken by ${duplicate.name}` })
                    };
                }
            }

            const newMember = {
                id: Date.now().toString(),
                name: name.trim(),
                position: position.trim(),
                jerseyNo: jerseyNo || '',
                age: age || '',
                address: address || '',
                height: height || '',
                preferredFoot: preferredFoot || '',
                status: status || 'Active',
                notes: notes || '',
                imageUrl: imageUrl || 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?q=80&w=800'
            };

            members.push(newMember);
            writeData(MEMBERS_FILE, members);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(newMember)
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
