"use strict";
const fs = require('fs');

var config = require('./configuration.js');
var download = require('./download.js');


var tags = ["T7.1.6a"];
download.sftp('./config/MG163_dsftp.json', 'V7.1.6a', tags, './', (err, data)=>{
	console.log(data);
});