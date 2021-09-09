const net = require('net')
const client = require('./client')
const server = require('./server')

const PORT = process.env.PORT || 3333
const HOST = process.env.HOST


async function chat(){
    try{
        await client.connect(PORT, HOST)
    } catch(err){
        console.log('Cant conenct to server,', err.message)
        const s = server.createServer(PORT)
    }
}

chat()