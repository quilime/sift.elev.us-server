const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const IncomingForm = require('formidable').IncomingForm
const ExifImage = require('exif').ExifImage;
var sizeOf = require('image-size');
const { Image } = require('./models');
const { v4: uuidv4 } = require('uuid');

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
  const checkType = (file) => new Promise(function(resolve, reject) {
    if (allowableTypes.hasOwnProperty(file.type)) {
      resolve();
    } else {
      res.json({...fileData, ...{ "error":  FILETYPE_ERROR_STR }});
      throw new Error(FILETYPE_ERROR_STR);
    }
  });

  // handle each file from form
  form.on('file', (field, file) => {
    
    fileData = {...file};

    // check file type
    checkType(fileData)
    
    // parse image info
    .then(parseEXIF(fileData.path))
    .then(function(exifData) {
      fileData.exif = exifData;  
      fileData.dims = sizeOf(fileData.path);
      return fileData;
    })

    // generate unique filename
    .then(function(fileData) {
      fileData.localName = shortid.generate() + '_' + Date.now() + '.' + allowableTypes[fileData.type];
      return fileData;
    })

    // manage filesystem
    .then(function(fileData) {
      let iter = true;
      let i = 0;
      do {

        // static destination
        fileData.localPath = process.env.STATIC_DIR + i;

        // check if folder exists and has enough space
        if (fs.existsSync(fileData.localPath) && fs.readdirSync(fileData.localPath).length < process.env.MAX_FILES) {
          console.log('Folder "' + fileData.localPath + '" exists and has space');
          iter = false;
          fileData.href = i;
          fs.copyFileSync(fileData.path, fileData.localPath + '/' + fileData.localName, (err) => { if (err) throw error; });
          return fileData;
        } 

        // if not, create new destination folder
        else {
          console.log('Iterating because "' + fileData.localPath + '" does\'t exist, or is full.');
          i++;
          fs.mkdirSync(process.env.STATIC_DIR + i, { recursive: true }, (err) => { if (err) throw err; });
        }
      } while(iter);
    })

    // insert to DB
    .then(function(fileData) {
      const newImage = Image.build({
        name: fileData.localName,
        href: fileData.href,
        type: fileData.type,
        size: fileData.size,
        width: fileData.dims.width,
        height: fileData.dims.height,
        fileInfo: fileData,
        uuid: uuidv4(),
        client_ip: req.header('x-forwarded-for') || req.connection.remoteAddress,
        client_agent: req.header('user-agent')
      });
      return newImage.save()
        .then((im) => {
          console.log('Successfuly inserted into DB: ', im.toJSON());
          return fileData;
        })
        .catch((err) => {
          console.log('Error inserting into DB', err);
          throw new Error(err);
        });
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
