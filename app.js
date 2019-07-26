var express = require('express');

var app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

var Message = require('./modules/db/message');
var tools = require('./modules/tools');
var Reply = require('./modules/db/reply');
var User = require('./modules/db/user');
var artTmpEngine = require('./modules/art-tem-config');
artTmpEngine(app);




var flash = require('connect-flash');
app.use(flash());


var md5 = require('md5');


var session = require('express-session');
var MongoStore = require('connect-mongo')(session);


app.use(session({
    secret: 'mylogin',
    resave: true,
    saveUninitialized: true,
    rolling: true,
    cookie: {
        maxAge: 1000 * 60 * 60
    },
    store: new MongoStore({
        url: 'mongodb://127.0.0.1/session-login'
    })
}));




app.use(function (req, res, next) {
    app.locals.user = req.session.user;
    next();
})


// 头像路由
var uploadRouter=require('./routes/upload');
app.use(uploadRouter);

// 首页
app.get('/', (req, res) => {
    console.log(req.session.user);
    
    var showCount = 7;
    var page = (req.query.page) * 1 || 1;
    // var error = req.flash('error').toString();
    Message
        .find()
        .sort({ time: -1 })
        .skip((page - 1) * showCount)
        .limit(showCount)
        .exec((err, data) => {
            Message.countDocuments((err, count) => {
                var msgs = JSON.parse(JSON.stringify(data));
                var pages = Math.ceil(count / showCount)
                res.render('index', {
                    msgs,
                    user: req.session.user,
                    page,
                    pages
                });
            })
        });
    // res.render('index');
});

// 发布
app.get('/publish', (req, res) => {

    res.render('publish');
})
app.post('/publish', (req, res) => {
    if (req.session.user) {
        var m = new Message({
            title: req.body.title,
            tag: req.body.tag,
            msg: req.body.msg,
            time: tools.dateFormat(new Date()),
            author: req.session.user.username,
            reples: [],
            count: 0
        });
        m.save((err) => {
            if (err) {
                console.log(err);
                res.send('发布失败')
            } else {
                res.redirect('/');
            }
        });
    } else {
        req.flash('error', '请登录');
        res.redirect('/login');
    }
});
app.get('/details/:_id', (req, res) => {

    Message
        .findOne({ _id: req.params._id })
        .populate('reples')
        .exec((err, data) => {
            console.log(data);
            data.count = data.count + 1;
            data.save(err => {
                var msgs = JSON.parse(JSON.stringify(data));
                console.log(msgs)
                res.render('details', msgs);
            })
        }
        )
})
// 编辑
app.get('/edit/:_id', (req, res) => {
    Message
        .findOne({ _id: req.params._id })
        .exec((err, data) => {
            var msgs = JSON.parse(JSON.stringify(data));
            res.render('edit', msgs);
        }
        )
})
// 标签
app.get('/tag/:tags', (req, res) => {
    var showCount = 7;
    var page = (req.query.page) * 1 || 1;
    Message
        .find({ tag: req.params.tags })
        .sort({ time: -1 })
        .skip((page - 1) * showCount)
        .limit(showCount)
        .exec((err, data) => {
            Message.countDocuments({ tag: req.params.tags }, (err, count) => {
                var msgs = JSON.parse(JSON.stringify(data));
                var pages = Math.ceil(count / showCount);
                res.render('tag', {
                    msgs,
                    page,
                    pages
                });
            }
            )
        })
})
// 作者
app.get('/author/:authors', (req, res) => {
    // console.log(123)
    var showCount = 7;
    var page = (req.query.page) * 1 || 1;
    Message
        .find({ author: req.params.authors })
        .sort({ time: -1 })
        .skip((page - 1) * showCount)
        .limit(showCount)
        .exec((err, data) => {
            Message.countDocuments({ author: req.params.authors }, (err, count) => {
                var msgs = JSON.parse(JSON.stringify(data));
                var pages = Math.ceil(count / showCount);
                console.log(msgs)
                res.render('author', {
                    msgs,
                    page,
                    pages
                });
            }
            )
        })
})





// 更新
app.post('/edit', (req, res) => {
    Message
        .updateOne({ _id: req.body.id }, {
            title: req.body.title,
            tag: req.body.tag,
            msg: req.body.msg
        }, (err, data) => {
            res.redirect('/');
        })
})



// 删除
app.get('/delet/:_id', (req, res) => {
    Message
        .deleteOne({ _id: req.params._id })
        .populate('reples')
        .exec((err) => {
            res.redirect('/')
        }
        )
})
// 回复
app.post('/add/reply', (req, res) => {
    var reply = new Reply({
        msg: req.body.msg,
        time: tools.dateFormat(new Date()),
        username: req.session.user.username
    });
    reply.save(err => {
        Message.findOne({ _id: req.body._id }, (err, msg) => {
            console.log(msg)
            msg.reples.push(reply._id);
            msg.save(err => {
                res.redirect(`/details/${req.body._id}`);
            });
        });
    });
})

// 注册
app.get('/regist', (req, res) => {
    var error = req.flash('error').toString();
    var error1 = req.flash('error1').toString();
    res.render('regist', { error, error1 });
});
app.post('/regist', (req, res) => {
    User.findOne({ username: req.body.username }, (err, data) => {
        if (data) {
            req.flash('error', '用户名已被抢注');
            res.redirect('/regist')
        } else {
            if (req.body.repassword == req.body.password) {
                req.body.password = md5(req.body.password);
                var obj=Object.assign(req.body,{
                    headerurl:'/img/timg.jpg'
                })
                var user = new User(obj);
                user.save(err => {
                    res.redirect('/login');
                });
            } else {
                req.flash('error1', '两次密码不一致，请重新输入');
                res.redirect('/regist')
            }
        }
    });
});

// 登录
app.get('/login', (req, res) => {
    var error = req.flash('error').toString();
    res.render('login', { error });
});
app.post('/login', (req, res) => {
    User.findOne({ username: req.body.username }, (err, user) => {
        if (!user) {
            req.flash('error', '用户名不存在');
            res.redirect('/login');
        } else {
            if (md5(req.body.password) == user.password) {
                req.session.user = user;
                res.redirect('/');
            } else {
                req.flash('error', '密码错误');
                res.redirect('/login');
            }
        }
    });
});





// 退出登录
app.get('/logout', (req, res) => {
    req.session.user = null;
    res.redirect('/');
});

// 模糊查询
app.get('/search', (req, res) => {
    var search = req.query.search
    var showCount = 7;
    var page = (req.query.page) * 1 || 1;
    Message
        .find({
            $or: [
                { author: { $regex: req.query.search, $options: '$i' } },
                { tag: { $regex: req.query.search, $options: '$i' } },
                { title: { $regex: req.query.search, $options: '$i' } }
            ]
        })
        .sort({ time: -1 })
        .skip((page - 1) * showCount)
        .limit(showCount)
        .exec((err, data) => {
            Message.countDocuments({
                $or: [
                    { author: { $regex: req.query.search, $options: '$i' } },
                    { tag: { $regex: req.query.search, $options: '$i' } },
                    { title: { $regex: req.query.search, $options: '$i' } }
                ]
            }, (err, count) => {
                var msgs = JSON.parse(JSON.stringify(data));
                var pages = Math.ceil(count / showCount);
                res.render('search', {
                    msgs,
                    page,
                    pages,
                    search
                });
            }
            )
        })
});

// 标签墙

app.get('/biaoqian', (req, res) => {
    var alltags = [];
    Message.find()
        .exec((err, data) => {
            data.forEach((tags) => {               
                tags.tag.forEach(tag => {
                    if (tag !=''){
                        alltags.push(tag)
                    }                   
                })
            })
            var  msgs = tools.arrFormat(alltags);
            res.render('biaoqian', {msgs});
        });
});


 
 // 存档

app.get('/cundang', (req, res) => {
    var condition = {};
    if (req.query.username) {
        condition.username=req.query.username
    }

    var showCount = 7;
    var page = (req.query.page) * 1 || 1;
    Message
        .find(condition)
        .sort({ time: -1 })
        .skip((page - 1) * showCount)         
        .exec((err,msg)=>{
            console.log(msg)
            if (err) {
                console.log('未找到')
            } else {
                var msgs = JSON.parse(JSON.stringify(msg));  
                console.log(msgs)             
                var Year = [];
                for(var i=0;i<msgs.length;i++){
                    msgs[i].index = i;
                    var years = msgs[i].time.slice(0,5);
                    Year.push(years);
                    var num = years.indexOf(year);
                  
                }
                    var year = tools.arrFormat(Year);
              
              Message.countDocuments((err,count)=>{
                // 所有的页数
                var pages =  Math.ceil(count/showCount);
                res.render('cundang',{
                    msgs,
                    page,
                    pages,                 
                    data:req.session.user,
                    year
                });
            });
            }
        })
})





app.listen(3000, () => {
    console.log('node running');
});


