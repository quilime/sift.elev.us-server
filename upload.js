const app = require('./app.js');
const IncomingForm = require('formidable').IncomingForm

app.post('/upload', function(req, res) {
  var form = new IncomingForm()

  form.on('file', (field, file) => {
    console.log(file.name);
    console.log(file.path);
    // Do something with the file
    // e.g. save it to the database
    // you can access it using file.path
  })
  form.on('end', () => {
    res.json()
  })
  form.parse(req)
});
