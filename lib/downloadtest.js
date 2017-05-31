const Download   = require('./download.js');
const Decompress = require('./decompress.js');
const Mkdirp     = require('./mkdirp.js');
const Config     = require('./configuration.js');
const Upload     = require('./upload.js');
const FileList   = require('./readFileList');


var u_basic_path = '';

var tags = ['V7.10.5'];

const download_flow = async() => {
	//var data = await Download.ftps('./config/MG163_dftps.json', 'V7.10.5' ,tags, './file/').catch(console.log.bind(console));
	//console.log('Data : ' + data);
	var list = await FileList.getList('./file').catch(console.log.bind(console));
	console.log('list : ' + list);
	var [tar, upload] = await FileList.tarList(list).catch(console.log.bind(console));
	console.log('Tar    : ' + ((tar.length)?tar:'No file to be untared'));
	console.log('Upload : ' + ((upload.length)?upload:'No file to be Uploaded'));
	var configobj = await Decompress.tgz('V7.10.5_rel.tgz','./file/','./file/MG163/','MG163_V7.10.5.json');
	//console.log(configobj)

}

download_flow();