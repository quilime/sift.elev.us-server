const express = require('express')
const upload = require('./upload')
const cors = require('cors')

const server = express()

var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
}

server.use(cors(corsOptions))

server.post('/upload', upload)

server.get('/', function(req, res){
   res.send("<pre>200 OK");
})

server.listen(8000, () => {
  console.log('Server started!')
})