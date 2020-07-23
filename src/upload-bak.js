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

const FILETYPE_ERROR_STR = 'Must be jpg, png, or gif';

exports.post = (req, res) => {  
  var form = new IncomingForm();
  
  // parse form
  form.parse(req);

  // object that will eventually be returned as JSON
  var fileData = {};

  // parse EXIF data
  const parseEXIF = (filePath) => new Promise(function(resolve, reject) {
    try {
      new ExifImage({ image : filePath }, function (error, exifData) {
        resolve(exifData);
      });
    } catch (error) {
      throw new Error(error);
    }
  });  

  // check type
  const checkType = (file, callback) => new Promise(function(resolve, reject) {
    if (allowableTypes.hasOwnProperty(file.type)) {
      resolve();
    } else {
      callback();
      throw new Error(FILETYPE_ERROR_STR);
    }
  });

  // handle each file from form
  form.on('file', (field, file) => {
    
    fileData.file = file;

    // check file type
    checkType(fileData.file, () => {
      res.json({"error":  FILETYPE_ERROR_STR});
    })
    
    // parse exif data
    .then(parseEXIF(fileData.file.path))
    .then(function(exifData) {
      fileData.exif = exifData;
      return fileData;
    })

    // generate unique filename
    .then(function(fileData) {
      fileData.uniqueFilename = shortid.generate() + '_' + Date.now() + '.' + allowableTypes[fileData.file.type];
      return fileData;
    })

    // manage filesystem
    .then(function(fileData) {
      let iter = true;
      let i = 0;
      do {

        // static destination
        fileData.destDir = process.env.STATIC_DIR + i + '/';

        // check if folder exists and has enough space
        if (fs.existsSync(fileData.destDir) && fs.readdirSync(fileData.destDir).length < process.env.MAX_FILES) {
          console.log('Folder "'+fileData.destDir+'" exists and has space');
          iter = false;
          fileData.localPath = fileData.destDir + fileData.uniqueFilename;
          fs.copyFileSync(fileData.file.path, fileData.localPath, (err) => { if (err) throw error; });
          return fileData;
        } 

        // if not, create new destination folder
        else {
          console.log('Iterating because "' + fileData.destDir + '" does\'t exist, or is full.');
          i++;
          fileData.destDir = process.env.STATIC_DIR + i + '/';
          fs.mkdirSync(fileData.destDir, { recursive: true }, (err) => { if (err) throw err; });
        }
      } while(iter);
    })

    // insert to DB
    .then(function(fileData) {
      console.log('Insert to database');
      return fileData;
    })

    // return json
    .then(function(fileData) {
      console.log("return!");
      res.json(fileData);
    })

    // catch all errors  
    .catch(function(err) {
      console.log('Upload Error');
      console.log(err);
    });

  });
};
