// @ts-check
const net = require('net')
const { Transform, Writable, pipeline } = require('stream')
const colors = require('./colors')
const { createWriteStream, createReadStream } = require('fs')

/**  @typedef {{ id: number, socket: NodeJS.ReadWriteStream, color: string, avatar: string, text: string}} Client */

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



class Server {
    constructor(port) {
        /** @type {Client[]} */
        this.clients = []
        this.historyFileName = `history-${port}.txt`
        this.history = createWriteStream(this.historyFileName)
        this.server = net.createServer()
        this.server
            .on('listening', () => {
                console.log(`Listening on ${this.server.address().address}:${this.server.address().port}`)
                console.log('-----------------------------------------------')
            })
            .on('close', () => console.log('Closed'))
            .on('error', err => console.log('Server Error:', err.message))
            .on('connection', socket => this.addClient(socket))

        this.addClient(process.stdin)
        this.server.listen(port)
    }

    /**
     * @param {*} socket 
     * @returns {Client}
     */
    addClient(socket) {
        const id = this.clients.length
        const avatar = this.makeAvatar()
        const color = colors.Next()
        const newClient = {
            id,
            avatar,
            socket,
            text: `${color}User ${id} ${avatar}\t❚ `,
            color,
        }
        this.sendHistory(newClient)
        this.broadcast(`${newClient.text}Joined...${colors.Reset}\n$`)
        this.clients.push(newClient)
        this.messagePipeline(newClient)
        return newClient
    }

    makeAvatar() {
        const start = 0x8C
        const end = 0xBC
        const diff = end - start
        const item = Math.floor(start + Math.random() * diff)
        const emoji = Buffer.from([0xF0, 0x9F, 0x90, item])
        return emoji.toString()
    }

    broadcast(message, fromId) {
        for (const c of this.clients) {
            if (c.id !== fromId) {
                c.socket.write(message)
            }
        }
        this.history.write(message)
    }

    /**
     * @param {Client} client 
     */
    sendHistory(client) {
        createReadStream(this.historyFileName)
            .on('data', d => client.socket.write(d))
    }


    broadcastWritable(fromId) {
        return new Writable({
            write: (chunck, encoding, cb) => {
                this.broadcast(chunck, fromId)
                cb()
            }
        })
    }

    /**
     * @param {Client} client 
     * @returns 
     */
    messagePipeline(client) {
        return pipeline(
            client.socket,
            prependChuncks(client.text, colors.Reset),
            this.broadcastWritable(client.id),
            (err) => {
                if (err) {
                    console.log('MessagePipeline Error:', err.message)
                }
            })
    }

}

const createServer = port => new Server(port)


module.exports = {
    createServer,
}