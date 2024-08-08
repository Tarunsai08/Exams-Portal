const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
var MongoDBStore = require("connect-mongodb-session")(session);
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const MongoClient = require('mongodb').MongoClient;

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(express.static('questionpapers'));
app.use('/questionpapers', express.static('questionpapers'));

//Database connection
const DATABASE_URL = "mongodb://localhost:27017/Internalexamportal"; // Update with your local MongoDB URL
const databaseconnection = async function () {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log("Connection successful");
  } catch (err) {
    console.log("Connection failed due to:", err);
  }
};
databaseconnection();

//Importing Models
const Student = require("./models/studentmodel");
const Teacher = require("./models/teachermodel");
const QuestionPaper = require("./models/questionpapermodel");

//Create sessions
const store = new MongoDBStore({
  uri: DATABASE_URL,
  collection: "sessions",
});
app.use(
  session({
    secret: "this is a secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

insertsubjects = async function(){
  if(!await QuestionPaper.findOne({subject:"ml"})){
    console.log("inserting...")
    await QuestionPaper.insertMany([{subject:"ml",qpArray:[]},{subject:"nndl",qpArray:[]},{subject:"oose",qpArray:[]},{subject:"ire",qpArray:[]},{subject:"wt",qpArray:[]},{subject:"cns",qpArray:[]}])
} 
}
insertsubjects();

//Default Route
app.get("/", (req, res) => {
  res.render("welcome");
});

//login - Get
app.get("/login", (req, res) => {
  res.render("login");
});

//logout route
app.get('/logout',(req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).send('Error logging out');
      } else {
        res.redirect('/'); 
      }
    });
})

//login - POST
app.post("/login", async (req, res) => {
  const { email, password, candidate } = req.body;
  let userexists = "";

  if (candidate == "admin") {
    if (email == "admin" && password == "admin") {
      req.session.user = "admin";
      res.redirect("/admin");
    } else {
      res.redirect("/");
    }
  } else if (candidate == "middleman") {
    if (email == "middleman" && password == "middleman") {
      req.session.user = "middleman";
      res.redirect("/middleman");
    } else {
      res.redirect("/");
    }
  } else if (candidate == "hod") {
    if (email == "hod" && password == "hod") {
      req.session.user = "hod";
      res.redirect("/hod");
    } else {
      res.redirect("/");
    }
  } else if (candidate == "teacher") {
    userexists = await Teacher.findOne({ name: email, password: password });
    console.log(email,password);
    console.log(userexists)
    if (userexists) {
      req.session.user = "teacher";
      req.session.userobj = userexists;
      res.redirect("/teacher");
    } else {
      res.redirect("/");
    }
  } else if (candidate == "student") {
    userexists = await Student.findOne({ rollno: email, password: password });
    if (userexists) {
      req.session.user = "student";
      req.session.userobj = userexists;
      res.redirect("/student");
    } else {
      res.redirect("/");
    }
  }
});

//admin Routes

//admin - Get route
app.get('/admin',(req,res)=>{
    res.render("admin");
})

//admin - Post route
app.post('/admin/:id',async (req,res)=>{
    if(req.params.id == "addteacher"){
        const {name,subject,section} = req.body;
        userexists = await Teacher.findOne({ name: name, section: section });
        if(!userexists){
            await Teacher.insertMany([{name: name, subject: subject, password: name, section: section,questionpaperstatus:"not uploaded"}])
            res.json('user inserted succesfully')
        }
        else{
            res.json('user already exists')
        }
    }
    else if(req.params.id == "addstudents"){
        const {startroll,endroll,section} = req.body;
        sectionexists = await Student.findOne({section:section});
        allstudents = []
        if(!sectionexists){
            for(let i=parseInt(startroll);i<=parseInt(endroll);i++){
                allstudents.push({rollno: 'A'+i,section:section,password:'A'+i})
            }
            await Student.insertMany(allstudents)
            res.json('All students added successfully');
        }
        else{
            res.json("Section Already Exists")
        }
    }
})

//teacher routes

//teacher - GET Routes
app.get('/teacher',async(req,res)=>{
    const teacher = req.session.userobj;
    const allstudents = await Student.find({section:teacher.section});
    res.render('teacher', {students:allstudents,teacher:teacher,subject:teacher.subject,status:teacher.questionpaperstatus});
})

app.get('/updatemarks', async(req, res) => {
    const teacher = req.session.userobj;
    const allstudents = await Student.find({section:teacher.section});
    res.render('updatemarks', {students:allstudents,teacher:teacher,subject:teacher.subject}); 
});

app.get('/uploadqp', async (req, res) => {   
    res.render('uploadqp',{status:req.session.userobj.questionpaperstatus}); 
});

//Update Marks of student
app.put('/updatemarks',async(req,res)=>{
    const {rollno, updatedMarks, subject} = req.body;
    const result = await Student.findOneAndUpdate(
        { rollno: rollno },
        { $set: { [`marks.${subject}`]: updatedMarks } }
    );
    res.json("updated successfully")
})

//Upload Question paper
const upload = multer({ dest: 'questionpapers/' })
app.post('/uploadqp', upload.single('file'), async(req,res)=>{
    const teacher = req.session.userobj;
    if(teacher.questionpaperstatus=="not uploaded"){
        if (req.file) {
            const teacher = req.session.userobj;
            const section = teacher.section;
            const name = teacher.name;

            const newFilename = `${name}-${section}${path.extname(req.file.originalname)}`;

            const filePath = path.join(__dirname, 'questionpapers', newFilename);
            const oldPath = req.file.path;
        
            fs.rename(oldPath, filePath, async(err) => {
              if (err) {
                console.error('Error renaming file:', err);
                res.status(500).json({ message: 'File upload failed!' });
              } else {
                console.log('File uploaded successfully:', filePath);
                const result = await Teacher.findOneAndUpdate(
            
                  teacher,
                    { $set: { questionpaperstatus: "uploaded" } },
                    { new: true }
                );
                req.session.userobj = result;
                console.log("updated in teachers");
                const updateInfo = {
                    teacher: name,
                    section: section,
                    url: newFilename,
                    selected: "no"
                  };
                  
                  const updatedQuestionPaper = await QuestionPaper.findOneAndUpdate(
                    { subject: teacher.subject },
                    { $push: { qpArray: updateInfo } }
                  );
                console.log("updated questionpaers");
                res.redirect('/teacher')
              }
            });
          } else {
            res.status(400).json({ message: 'No file uploaded!' });
          }
    }else {
        res.status(400).json({ message: 'You have uploaded the question paper already' });
    }
});

//Student Routes
app.get('/student',async(req,res)=>{
    const student = req.session.userobj;
    res.render('student',{student:student});
})

//Hod Routes
app.get('/hod',async(req,res)=>{
  const quepapers = await QuestionPaper.find();
  const students = Student.find();
  res.render('hod', {Questionpapers: quepapers, students: students});
})

app.get('/selectqp',async(req,res)=>{
  const quepapers = await QuestionPaper.find({});
  res.render('selectqp', { quepapers: quepapers });
})

app.post('/selectqp',async(req,res)=>{

  const subject = Object.keys(req.body)[0];
  const section = req.body[subject];

  const questionPaper = await QuestionPaper.findOne({ subject });
  
    if (!questionPaper) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    const selectedPaperIndex = questionPaper.qpArray.findIndex(
      (qp) => qp.section === section
    );
    
    if (selectedPaperIndex === -1) {
      return res.status(404).json({ message: 'Question paper for this section not found' });
    }

    //questionPaper.qpArray[selectedPaperIndex].selected = 'yes';
    questionPaper.selected = section; 

    await questionPaper.save();

    res.redirect('/selectqp');
})

app.get('/viewmarks',async(req,res)=>{
  const allstudents = await Student.find({});
  res.render('viewmarks',{students:allstudents});
})

//middleman Route
app.get('/middleman',async(req,res)=>{
  const questionpapers = await QuestionPaper.find({});
  let output = [];

questionpapers.forEach(subject => {
    let selectedQpArray = subject.qpArray.find(qp => qp.section === subject.selected);
    if (selectedQpArray) {
        output.push({
            subject: subject.subject,
            selectedQpArray: selectedQpArray
        });
    }
});
  console.log(output);
  res.render('middleman',{selectedqps:output});
})

app.listen(3000, (req, res) => {
  console.log("server running...");
});
