const fs = require('fs');
const S = require('string');

const write_promise = (file,data,eStr) => {
	return new Promise((resolve, reject)=>{
		fs.writeFile(file, JSON.stringify(data),(err)=>{
			if(err){
				console.error(err);
				reject(err);
			}else{
				console.log(eStr);
				resolve(true);
			}
		});
	});
} 

const read_promise = (file) => {
	return new Promise((resolve,reject)=>{
		var configObj = '';
		console.log(file);
		fs.readFile(file,'utf-8',(err,data)=>{
			configObj = JSON.parse(data);
			if(err)
				reject(err);
			resolve(configObj);
		});
	});
}

const get_promise = (file,keyStr) => {
	return new Promise(async(resolve, reject)=>{
		var strArr = S(keyStr).splitLeft('.');
		var num = strArr.length;
		var data = await read_promise(file);

		if(data!=null){
			var configObj = data;
			var findString = '';
			//check field.
			for(var i = 0 ; i < num ; i++){
				if(configObj[strArr[i]] instanceof Object){
					configObj = configObj[strArr[i]];
				}else{
					findString = configObj[strArr[i]];
				}
				
				if(configObj == null || findString == null){
					console.log('[Configuration.js][Error] key word error, please try and check your search key');
					resolve('');
				}
			}
			resolve(findString);				
		}else{
			
			reject('[Configuration.js][Error] config file ' + file + ' can\'t read normally');			
		}
	});
	
}

const set_promise = (file,keyStr,value) => {
	return new Promise(async(resolve,reject)=>{
		var strArr = S(keyStr).splitLeft('.');
		var num = strArr.length;
		var exeStr = 'configObj';

		var data = await get_promise(file, keyStr).catch(console.log.bind(console));

		if(data == ''){
			console.log('[Configuration.js][Error] Check your keyword again, Thanks!');

		}else{
			//continue to do
			var configObj = await read_promise(file).catch(console.log.bind(console));

			//parse and set the configObj value
			for(var i = 0 ; i < num ; i++){
				 exeStr = exeStr + '.' +  strArr[i];
			}
			exeStr = exeStr + '=\'' + value + '\'';
			eval(exeStr);
			//console.log(configObj);
			var writebool = await write_promise(file, configObj,'[Configuration.js] Set the value to config file successfully.');
			
			if(writebool){
				console.log('Set config successfully');
				resolve(configObj);
			}else{
				reject('[Configuration.js] Set config failed');
			}
		}
	});
}



module.exports = {
	WriteConfig : async(file,data,eStr) => {   //update config from object data.
		var data = await write_promise(file,data,eStr);
		return data;
	},

	ReadConfig: async(file) => {
		var configObj = await read_promise(file);
		return configObj;
	},
	SetConfig : async(file,keyStr,value) => {   //update config from the key word field
		var data = await set_promise(file,keyStr,value);
		return data;
	},
	GetConfig : async(file,keyStr) =>{   //get the config data from the key field
		var data = await get_promise(file, keyStr);
		return data;
	}
}


/***
Test:
var data = await Upload.ftp("./config/MG163_uftp.json","./file/DarlingTest0523.docx",false);
	console.log('---' + data);

***/