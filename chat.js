const net = require('net')
const { Transform, Writable, pipeline } = require('stream')
const colors = require('./colors')
const { createWriteStream, createReadStream } = require('fs')

const PORT = process.env.PORT || 3333
const HOST = process.env.HOST

const historyFileName = `history-${PORT}.txt`

/**  @typedef {{id: number, client: NodeJS.WritableStream, color: string, avatar: string, text: string}} Client */

/** @type {Client[]} */
const clients = []

/** @type {NodeJS.WritableStream} */
let historyFile;

const makeAvatar = () => {
    const start = 0x8C
    const end = 0xBC
    const diff = end - start
    const item = Math.floor(start + Math.random() * diff)
    const emoji = Buffer.from([0xF0, 0x9F, 0x90, item])
    return emoji.toString()
}


function addClient(client) {
    const id = clients.length
    const avatar = makeAvatar()
    const color = colors.Next()
    const newItem = {
        id,
        avatar,
        client,
        text: `${color}User[${id}] ${avatar}> `,
        color,
    }
    clients.push(newItem)
    messagePipeline(newItem)
    return newItem
}

const prependChuncks = (prepend, append) => {
    const pre = Buffer.from(prepend)
    const pos = Buffer.from(append)
    return new Transform({
        transform: (chunck, encoding, cb) => {
            const newBuffer = Buffer.concat([pre, chunck, pos])
            cb(null, newBuffer)
        }
    })
}

const broadcast = (message, fromId) => {
    for (const c of clients) {
        if (c.id !== fromId) {
            c.client.write(message)
        }
    }
    historyFile.write(message)
}

const broadcastWritable = fromId => new Writable({
    write: (chunck, encoding, cb) => {
        broadcast(chunck, fromId)
        cb()
    }
})

/**
 * 
 * @param {NodeJS.ReadableStream} readable 
 * @param {Client} client 
 * @returns 
 */
const messagePipeline = (client) => pipeline(
    client.client,
    prependChuncks(client.text, colors.Reset),
    broadcastWritable(client.id),
    (err) => {
        if (err) {
            console.log('MessagePipeline Error:', err.message)
        }
    }
)

function createClient(port, host) {
    console.log(`Connecting to ${port}`)
    const client = new net.Socket();
    client.pipe(process.stdout)
    client.on('connect', () => {
        console.log('Connected')
        process.on('SIGINT', () => {
            client.write('Bye!\n')
            client.destroy()
            process.exit(0)
        })
    })
        .on('ready', () => process.stdin.pipe(client))
        .on('error', err => {
            console.log('Socket Error:', err.message)
            createServer(port)
        })
        .connect({
            port,
            host,
        })

}

function createServer(port) {
    console.log('Creating Server...')
    historyFile = createWriteStream(historyFileName)

    const server = net.createServer()
    server.on('listening', () => {
        console.log(`Listening on ${server.address().address}:${server.address().port}`)
        console.log('-----------------------------------------------')
    })
        .on('close', () => console.log('Closed'))
        .on('error', err => console.log('Error:', err.message))
        .on('connection', (socket) => {
            const c = addClient(socket)
            createReadStream(historyFileName).on('data', d => socket.write(d))
            broadcast(`${c.text}Joined...${colors.Reset}\n$`)
        })
    addClient(process.stdin)
    server.listen(port)
}

createClient(PORT, HOST)