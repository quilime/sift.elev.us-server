const app = require('./app.js');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const IncomingForm = require('formidable').IncomingForm
const ExifImage = require('exif').ExifImage;

const allowableTypes = {
  'image/jpeg' : 'jpg',
  'image/jpg' : 'jpg',
  'image/png' : 'png',
  'image/gif' : 'gif',
}

app.post('/upload', function(req, res) {
  var form = new IncomingForm();
  form.parse(req);

  var fileData = {};

  form.on('file', (field, file) => {
    
    fileData.file = file;

    const errHandler = function(err) {
      console.log(err);
    };

    const parseEXIF = (filePath) => new Promise(function(resolve, reject) {
      try {
        new ExifImage({ image : filePath }, function (error, exifData) {
          resolve(exifData);
        });
      } catch (error) {
        reject(error);
      }
    });

    // parse exif data
    parseEXIF(file.path).then(function(exif) {
        fileData.exif = exif;
        return fileData;
      }, errHandler)

      // then generate filename
      .then(function(fileData){
        if (allowableTypes.hasOwnProperty(fileData.file.type)) {
          fileData.uniqueFilename = 
            shortid.generate() + '_' + Date.now() + '.' + allowableTypes[fileData.file.type];
          return fileData;
        } else {
          throw new Error('Filetype "' + fileData.file.type + '" is not allowed.'); 
        }
      }, errHandler)

      // then insert to DB
      .then(function(fileData){
        console.log('upload to database');
        return fileData;
      }, errHandler)

      // then manage filesystem
      .then(function(fileData){
        var iter = true;
        var i = 1;

        do {
          fileData.destDir = process.env.STATIC_DIR + i + '/';
          if (fs.existsSync(fileData.destDir) && fs.readdirSync(fileData.destDir).length < process.env.MAX_FILES) {
            console.log('folder exists and is good');
            return fileData;
          } else {
            console.log('iterating because folder is full');
            i++;
            fileData.destDir = process.env.STATIC_DIR + i + '/';
            fs.mkdirSync(fileData.destDir, { recursive: true }, (err) => {
              console.log('create new folder');
              iter = false;
              return fileData;
              if (err) throw err;
            });            
          }
        }
        while(iter);
      })

      // then move static asset
      .then(function(fileData) {
        fileData.localPath = fileData.destDir + fileData.uniqueFilename;
        fs.copyFile(fileData.file.path, fileData.localPath, (error) => {
          if (error) {
            throw error;
          }
          console.log('File moved!');
          return true;
        });
      }, errHandler)

  });
  
  form.on('end', () => {
    console.log('form end');
    res.json();
  });
});
