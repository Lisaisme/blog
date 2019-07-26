var express = require('express');
var fs = require('fs');
var router = express.Router();
var multer = require('multer');

var User = require('../modules/db/user');

 
var uploadpath = './public/img/';
var headername;
 
var stroage = multer.diskStorage({
    
    destination:function(req,file,cb){
        cb(null, uploadpath);
    },
   
    filename:function(req,file,cb){  
      
        var arr = file.originalname.split('.')
        var ext = arr[arr.length-1];      
        headername = req.session.user.username+'-'+Date.now()+'.'+ext;       
        cb(null, headername);
    }
});

var upload = multer({
    storage:stroage,
    limits:{     
        fileSize:1024*1024*10
    },
    
    fileFilter:function(req,file,cb){
        if (file.mimetype.startsWith('image')) {
            cb(null, true); 
        } else {
         
            cb('只能上传图片', false); 
        }
    }
});
router.get('/edits/userinfo',(req,res)=>{
    res.render('edit-headerimg');
})
 

router.post('/upload/header',upload.single('headerimg'),(req,res)=>{
    
   
    var headerurl = '/img/'+headername;    
    if (fs.existsSync(uploadpath+headername)) {
        User.findOne({_id:req.session.user._id},(err,user)=>{         
            if (user.headerurl != '/img/timg.jpg') { 
                fs.unlinkSync('./public'+user.headerurl);
            }          
            user.headerurl = headerurl;
            user.save(()=>{              
                req.session.user.headerurl = headerurl;
                res.redirect('/')
            });
        });
    } else {
        res.send('上传失败');
    }
    

    
});

module.exports = router;