const mkdirps = require('mkdirps');
const fs = require('fs');
const fse = require('fs-extra');
const S = require('string');
const tar = require('tar-fs');
const zlib = require('zlib');
const Config = require('./configuration.js');

const decompress_tgz = (filename, orignalPath, destPath, configFile, callback) => {
	var confile = './config/' + configFile;
	var extract = tar.extract(destPath);
	var fileString = '';
	var configobj = '';

	fs.readFile(confile,'utf-8',function(err,data){
		if(err){
			console.error(err);
		}

		configobj = JSON.parse(data);
		configobj['Tarball']['OriginPath'] = orignalPath;
		configobj['Tarball']['DestPath'] = destPath;

		extract.on('entry', function(header, stream, cb) {
	   
		   	var headerArr = S(header.name).splitLeft('/');
		   	fileString = headerArr[headerArr.length - 1]; //file name


		   	pathFoldar = headerArr[0];   //first folder
		   	if(configobj['Tarball']['File'] == ''){
		   		configobj['Tarball']['File'] = fileString;
		   	}else{
		   		configobj['Tarball']['File'] =  configobj['Tarball']['File'] + ',' + fileString;  
		   	}
		   	
		   	console.log(fileString);

		    stream.on('end', function() {
		        cb();
		    });

		    stream.resume();
		});
		extract.on('finish', async function() {
			console.log(configobj);
		    console.log(' untar complete!');
		    try{
		    	var wCon = await Config.WriteConfig(confile,configobj,"Update " + configFile + " file!");
		    	callback(null,wCon);
		    }catch(e){
		    	callback(e,'');
		    }			
		});

		fs.createReadStream(orignalPath + '/' + filename)
		   .pipe(zlib.createGunzip())
		   .pipe(extract);		
	});
}

const decompress_tgz_promise = (filename, orignalPath, destPath, configFile) => {
	return new Promise((resolve, reject) => {
		decompress_tgz(filename, orignalPath, destPath, configFile, (err, configobj) => {
			if (err)
				reject(err);
			resolve(configobj);
		});
	});
}	

module.exports = {
	tgz : async(filename, orignalPath, destPath, configFile) => {
		console.log('Decompress stage...');
		var configobj = await decompress_tgz_promise(filename, orignalPath, destPath, configFile);		
		return configobj;
	}
}



