const glob = require("glob");
const fs   = require("fs");
const S = require("string");

const filefilter = (arr, cb) => {
	var fileArray = [];
	for(var i = 0; i < arr.length ; i++){
		if((fs.lstatSync(arr[i])).isFile()){
			fileArray.push(arr[i]);
		}		

	}
	if(cb){
		return cb("", fileArray);
	}
}

const filelist = (dir,cb) => {
	glob(dir + "**/**/**/**/**/**/**/*", (err,file)=>{
		if(err){
			console.log(err);
			if(cb){
				return cb(err,"");
			}
		}
		filefilter(file, (err,list) => {
			if(err){
				console.log("err");
				return -1;
			}

			if(cb){
				return cb("", list);
			}
		});
	});
}

const list_ = (dir) => {
	return new Promise((resolve, reject) => {
		filelist(dir, (err,list)=> {
			if(err)
				reject(err);
			resolve(list);
		});
	});
}



const tarfilter = (list, way, cb) => {
	var tarArray = [], uploadArray = [];
	var slength = 0;
	var s = "";
	for(var i=0;i<list.length;i++){
		//console.log(list[i]);
		if (S(list[i]).contains('tar') || S(list[i]).contains('tar.gz') || S(list[i]).contains('tgz')){
			tarArray.push(list[i]);
		} else{
			uploadArray.push(list[i]);
		}
	}

	if(way){
		return cb("", tarArray);
	}else{
		return cb("", uploadArray);
	}
}

const tar_ = (list, way) =>{
	return new Promise((resolve, reject) => {
		tarfilter(list, way, (err,tar) => {
			if(err)
				reject(err);
			resolve(tar);
		});
	});
}

const upload_ = (list, way) =>{
	return new Promise((resolve, reject) => {
		tarfilter(list, way, (err,upload) => {
			if(err)
				reject(err);
			resolve(upload);
		});
	});
}


module.exports = {

	getList : async(dir) => {
		var list = await list_(dir);
		return list;	
	},

	tarList : async (list) => {
		var tar = await tar_(list, true);
		var upload = await upload_(list, false);
		return [tar, upload];
	}
}

