module.exports = (express,passport,db,bcrypt)=>{
const nodemailer = require('nodemailer');
    //Declare router variable 
    const router = express.Router();
    const auth = require('./../config/passport/passport.js')(passport,db);
    

    router.route('/login')
        .post(passport.authenticate('local',{
            //if valid redirect to home
            successRedirect:'/#',
            //if not redirect back to login and pass in flash errors
            failureRedirect:'/',
            failureFlash:true
        }));

    //Get logout will simply logout the user using logout();
    router.route('/logout')
        .get((req,res)=>{
            req.logout();
            res.redirect('/');
        });

    //Post route for register
    router.route('/register')
        .post((req,res,next)=>{
            var user = req.body;
            console.log(user);
            if(req.isAuthenticated() == false){
                //if the userpassword matches continue
                if(user.password === user.repassword){
                    //Declare number of salt rounds default:10
                    const saltRounds = 10;
                    //Hash the normal password for protected and pass it as hash
                    bcrypt.hash(user.password, saltRounds, (err, hash) =>{
                        var userID;
                        //Query the Users table and pass in the required fields including the hash pw
                        db.Users.create({
                            "username": user.username,
                            "email": user.email,
                            "password": hash
                        }).then((data)=>{
                            //When done grab the new user id and store it in a variable
                            userID = data.dataValues.id;
                            //create the user in owners table
                            db.owners.create({
                                "owner_fname": user.fname,
                                "owner_lname": user.lname,
                                "owner_dob": user.dob,
                                "owner_sex": user.sex,
                                "phone": user.phone,
                                "fax": user.fax,
                                "address": user.address,
                                "city": user.city,
                                "state": user.state,
                                "zip": user.zip,
                                "UserId": userID
                            }).then((result)=>{
                                //login the user with the id and redirect to dashboard
                                req.login(userID,(err)=>{
                                    res.redirect('/#');
                                });
                            }).catch((err)=>{
                                console.log(err);
                                db.Users.destroy({
                                    where:{
                                        id:userID
                                    }
                                }).then((data)=>{
                                    //if there is any errors render register and pass in the error flash msgs
                                    res.render('index',{
                                        username: req.body.username,
                                        fname: req.body.fname,
                                        lname: req.body.lname,
                                        email: req.body.email,
                                        dob: req.body.dob,
                                        phone: req.body.phone,
                                        fax: req.body.fax,
                                        address: req.body.address,
                                        city: req.body.city,
                                        zip: req.body.zip,
                                        regError:err.errors
                                    });
                                }).catch((err)=>{
                                    console.log(err);
                                    res.render('index',{
                                        username: req.body.username,
                                        fname: req.body.fname,
                                        lname: req.body.lname,
                                        email: req.body.email,
                                        dob: req.body.dob,
                                        phone: req.body.phone,
                                        fax: req.body.fax,
                                        address: req.body.address,
                                        city: req.body.city,
                                        zip: req.body.zip,
                                        regError:err.errors
                                    });
                                })
                            })
                        }).catch((err)=>{
                            console.log(err.errors);
                            //if there is any errors render register and pass in the error flash msgs
                            res.render('index',{
                                username: req.body.username,
                                fname: req.body.fname,
                                lname: req.body.lname,
                                email: req.body.email,
                                dob: req.body.dob,
                                phone: req.body.phone,
                                fax: req.body.fax,
                                address: req.body.address,
                                city: req.body.city,
                                zip: req.body.zip,
                                regError:err.errors
                            });
                        });
                    });
                } else {
                    //else render register page again with filled values and flash msg
                    res.render('index',{
                        username: req.body.username,
                        fname: req.body.fname,
                        lname: req.body.lname,
                        email: req.body.email,
                        dob: req.body.dob,
                        phone: req.body.phone,
                        fax: req.body.fax,
                        address: req.body.address,
                        city: req.body.city,
                        zip: req.body.zip,
                        regError:[{"message": "Your passwords do not match. Try again."}]
                    });
                }
            } else {
                res.redirect('/');
            }
        });

    router.route("/owner/:ownerId?")
        .get(auth(), (req, res, next) => {
            db.owners.findOne({
                where: {userId: req.user},
            }).then(function(results) {
                console.log(results);
                res.json([results.dataValues]);
            }); 
        })
       .post(auth(),(req, res, next) => {
            // Create owner
            // Redirect to /owner
            db.owners.create({
                userId: req.body.userId,
                owner_fname: req.body.owner_fname,
                owner_lname: req.body.owner_lname,
                owner_dob: req.body.owner_dob, 
                owner_sex: req.body.owner_sex,
                address: req.body.address,
                city: req.body.city,
                state: req.body.state,
                zip: req.body.zip,
                phone: req.body.phone,
                fax: req.body.fax
            }).then((results) => {
                res.json(results)
            });
        })
        .put(auth(),(req, res, next) => {
            // Update owner
            console.log(req.body.data);
            req.body.data.forEach(function(dataObject){
                db.owners.update(dataObject, 
                { 
                    fields: Object.keys(dataObject), 
                    where: {id: dataObject.id} 
                });
                res.json({"success":""});
            });
        })
        .delete(auth(),(req, res, next) => {
            db.owners.findOne({
                attributes: ['id'],
                where: {userId: parseInt(req.user)},
            }).then((results) => {
                 var tempOwnerId=results.id
                 var tempSQL = db.sequelize.dialect.QueryGenerator.selectQuery('pets',
                        {attribute: ['id'], where: {ownerId: results.id}}).slice(0,-1); // to remove the ';' from the end of the SQL
                tempSQL=tempSQL.replace('*','id')
                db.medical_history.destroy({
                    where: {petId: {$in: db.sequelize.literal('(' + tempSQL + ')')}}
                }).then((results) => {
                    db.vaccinations.destroy({
                        where: {petId: {$in: db.sequelize.literal('(' + tempSQL + ')')}}
                    }).then((results) => {
                        db.pets.destroy({
                            where: {ownerId: tempOwnerId}
                        }).then((results) => {
                            db.owners.destroy({
                                where: {id: tempOwnerId}
                            }).then((results) => {
                                res.json(results);
                            })
                        });
                    });
                });
            });
        });

    
    router.route("/pet/:petId?")
        .get(auth(),(req, res, next) => {
             if (req.params.petId) {
                db.owners.findAll({
                    attributes: ['userId'],
                   where: {userId: parseInt(req.user)},
                   include: {model: db.pets, required: true,
                             where: {id: parseInt(req.params.petId)},
                             order: [[{model: db.pets}, 'pet_type'],[{model: db.pets}, 'pet_name']]
                }}).then(function(results) {
                    console.log(results.length);
                    if (results.length===0) {
                        res.json({});
                    }
                    else {
                        res.json(results[0].pets);
                    }    
                }); 
            }
            else {
                 db.owners.findAll({
                    attributes: ['userId'],
                   where: {userId: parseInt(req.user)},
                   include: {model: db.pets, required: true,
                   order: [[{model: db.pets}, 'pet_type'],[{model: db.pets},'pet_name']]
                 }}).then(function(results) {
                     console.log(results.length);
                     if (results.length===0) {
                        res.json({});
                    }
                    else {
                        res.json(results[0].pets);
                    }    
                    
                }); 
            }
        })
        .post(auth(),(req, res, next) => {
            db.owners.findOne({
                where: {userId: req.user},
            }).then(function(results) {
                console.log(results.dataValues);
                // Create pet
                db.pets.create({
                    ownerId: results.dataValues.id,
                    pet_name: req.body.data[0].pet_name,
                    pet_type: req.body.data[0].pet_type,
                    pet_breed: req.body.data[0].pet_breed,
                    pet_color: req.body.data[0].pet_color,
                    license_no: req.body.data[0].license_no,
                    microchip_no: req.body.data[0].microchip_no,
                    insur_name: req.body.data[0].insur_name,
                    insur_id: req.body.data[0].insur_id,
                    insur_phone: req.body.data[0].insur_phone,
                    pet_dob: req.body.data[0].pet_dob,
                    pet_dod: req.body.data[0].pet_dod,
                    pet_age: req.body.data[0].pet_age,
                    pet_sex: req.body.data[0].pet_sex,
                    spayed_neutered_ind: req.body.data[0].spayed_neutered_ind,
                    pet_image_url: req.body.data[0].pet_image_url,
                    cond1: req.body.data[0].cond1,
                    cond2: req.body.data[0].cond2,
                    cond3: req.body.data[0].cond3,
                    med1: req.body.data[0].med1,
                    med2: req.body.data[0].med2,
                    med3: req.body.data[0].med3,
                    vet1_name: req.body.data[0].vet1_name,
                    vet1_specialty: req.body.data[0].vet1_specialty,
                    vet1_address: req.body.data[0].address,
                    vet1_city: req.body.data[0].vet1_city,
                    vet1_state: req.body.data[0].vet1_state,
                    vet1_zip: req.body.data[0].vet1_zip,
                    vet1_phone: req.body.data[0].vet1_phone,
                    vet1_email: req.body.data[0].vet1_email,
                    vet1_fax: req.body.data[0].fax,
                    vet2_name: req.body.data[0].vet2_name,
                    vet2_specialty: req.body.data[0].vet2_specialty,
                    vet2_address: req.body.data[0].vet2_address,
                    vet2_city: req.body.data[0].vet2_city,
                    vet2_state: req.body.data[0].vet2_state,
                    vet2_zip: req.body.data[0].zip,
                    vet2_phone: req.body.data[0].vet2_phone,
                    vet2_email: req.body.data[0].vet2_email,
                    vet2_fax: req.body.data[0].vet2_fax
                }).then((results) => {
                    res.json(results);
                });
            }); 
        })
        
        .put(auth(),(req, res,next) => {
            console.log(req.body.data);
            req.body.data.forEach(function(dataObject){
                db.pets.update(dataObject, { 
                    fields: Object.keys(dataObject), 
                    where: {id: dataObject.id} 
                }).then((results)=>{
                    console.log(results);
                }).catch((err)=>{
                    console.log(err);
                    return err;
                });
            });
            res.json({"success":""});
        })
        .delete(auth(),(req, res, next) => {
            console.log(req.query.ids);
            var idsArray = req.query.ids;
            idsArray.forEach((id)=>{
                db.vaccinations.destroy({
                    where: {petId: id}
                }).then((results) => {
                    db.medical_history.destroy({
                        where: {petId: id}
                    }).then((results) => {
                        db.pets.destroy({
                            where: {id: id}
                        });
                    });
                });
            });
            res.json({"success":""});
        });
            
    

    router.route("/med-history/:petId?")
        .get(auth(),(req, res, next) => {
             if (req.params.petId) {
                db.owners.findAll({
                    attributes: ['userId'],
                    where: {userId: parseInt(req.user)},
                    include: {model: db.pets, required: true,
                                attributes: [['id','petId']],
                                where: {id: parseInt(req.params.petId)},
                                order: [[{model: db.pets}, 'ownerId']],
                                include: {model: db.medical_history, required: true},
                                order: [[{model: db.medical_history}, 'petId', 'ASC' ],[{model: db.medical_history}, 'svc_dt', 'DESC' ],[{model: db.medical_history}, 'prov_name', 'ASC' ]]
                    }}).then(function(results) {
                        if (results.length===0  || results[0].length===0) {
                            res.json(results);
                        }
                        else {
                            res.json(results[0].pets[0].medical_histories);
                        }
                    }); 
                }
            else {
                 db.owners.findAll({
                   attributes: ['userId'],
                   where: {userId: parseInt(req.user)},
                   include: {model: db.pets, required: true,
                            attributes: [['id','petId']],
                            order: [[{model: db.pets}, 'ownerId']],
                            include: {model: db.medical_history, required: true},
                            order: [[{model: db.medical_history}, 'petId', 'ASC' ],[{model: db.medical_history}, 'svc_dt', 'DESC' ],[{model: db.medical_history}, 'prov_name', 'ASC' ]]
                    }}).then(function(results) {
                        if (results.length===0) {
                               res.json(results);
                        }
                        else {
                        res.json(results[0].pets);
                        }
                }); 
            }
        })
        .post(auth(),(req, res, next) => {
            console.log(req.body);
              db.medical_history.create({
                petId: req.body.data[0].petId,
                prov_name: req.body.data[0].prov_name,
                cond1: req.body.data[0].cond1,
                svc_dt: req.body.data[0].svc_dt,
                total_billed_amt: req.body.data[0].total_billed_amt,
                total_paid_amt: req.body.data[0].total_paid_amt,
                notes: req.body.data[0].notes,
                doc_type: req.body.data[0].doc_type,
                doc_image_url: req.body.data[0].doc_image_url
            }).then((data)=>{
                res.json(data);
            })
        })
        .put(auth(),(req, res, next) => {
            // Update med bill
            console.log(req.body);
            req.body.data.forEach(function(dataObject){
                db.medical_history.update(dataObject, 
                    { 
                        fields: Object.keys(dataObject), 
                        where: {id: dataObject.id} 
                    });
            });
            res.json({"success":""});
        })
        .delete(auth(),(req, res,next) => {
            console.log(req.query);
            var idsArray = req.query.ids;
            idsArray.forEach((id)=>{
                db.medical_history.destroy({
                    where: {id: id}
                })
            });
            res.json({"success":""});
        });
   
    router.route("/vaccinations/:petId?")
        .get(auth(),(req, res, next) => {
             if (req.params.petId) {
                db.owners.findAll({
                   attributes: ['userId'],
                   where: {userId: parseInt(req.user)},
                   include: {model: db.pets, required: true,
                             where: {id: parseInt(req.params.petId)},
                             attributes: [['id','petId']],
                             include: {model: db.vaccinations, required: true,
                             order: [[{model: db.vaccinations}, 'petId', 'ASC' ],[{model: db.vaccinations}, 'last_vacc_dt', 'DESC' ],[{model: db.vaccinations}, 'vacc_name', 'ASC' ]]}
                }}).then(function(results) {
                        if(results.length===0 || results[0].pets[0].length===0) {
                            res.json(results);
                        }
                        else {
                         res.json(results[0].pets[0].vaccinations);
                        }
                }); 
            }
            else {
                 db.owners.findAll({
                   attributes: ['userId'],
                   where: {userId: parseInt(req.user)},
                   include: {model: db.pets, required: true,
                   attributes: [['id','petId']],
                   include: {model: db.vaccinations, required: true,
                   order: [[{model: db.vaccinations}, 'petId', 'ASC' ],[{model: db.vaccinations}, 'last_vacc_dt', 'DESC' ],[{model: db.vaccinations}, 'vacc_name', 'ASC' ]]}
                 }}).then(function(results) {
                        if (results.length===0 ||  results[0].pets.length===0) {
                            res.json(results);
                        }
                        else {
                            res.json(results[0].pets);
                        }
                }); 
            }
        })
        .post(auth(),(req, res, next) => {
            // Create vaccination
            db.vaccinations.create({
                petsId: req.body.petId,
                vacc_name: req.body.vacc_name,
                last_vacc_dt: req.body.last_vacc_dt,
                next_vacc_dt: req.body.next_vacc_dt,
                vacc_image_url: req.body.vacc_image_url
            }).then((results) => {
                res.json(results);
            });
        })
        .put(auth(),(req, res, next) => {
            // Update med bill
            console.log(req.body);
            req.body.data.forEach(function(dataObject){
                db.vaccinations.update(dataObject, 
                    { 
                        fields: Object.keys(dataObject), 
                        where: {id: dataObject.id} 
                    });
                res.json({"success":""});
            });
        })
        .delete(auth(),(req, res, next) => {
            var idsArray = req.query.ids;
            idsArray.forEach((id)=>{
                db.vaccinations.destroy({
                    where: {id: parseInt(id)}
                });
            });
            res.json({"success":""});
        });
        
         router.route("/petmd")
        .post((req, res) => {
            var request = require("request");
            var queryParams = req.body;

            var options = { method: 'GET',
            url: 'http://www.petmd.com/servicefinderapi/select',
            qs: queryParams,
            headers: 
            { 'cache-control': 'no-cache' } };

            request(options, function (error, response, body) {
            if (error) throw new Error(error);

            console.log(body);
            }).pipe(res);

        });

        router.route('/password-reset')
        .post((req, res) => {
            // Password reset route
                // Send users an email with a link to a page where they can reset their passwords
                var tempPassword = 'alsdf23450fv848';

                var transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true, // secure:true for port 465, secure:false for port 587
                    auth: {
                        user: 'healthepetz@gmail.com',
                        pass: 'C0deb00tcamp'
                    }
                });
            
                db.Users.update({
                    password: tempPassword
                },
            {
                where: {
                    email: 'test.healthepetz@gmail.com'
                }
            }).then((results) => {
                var ownerEmail = req.body.email;
            
                let mailOptions = {
                    from: '"HealthePetz" <healthepetz@gmail.com>', // sender address
                    to: ownerEmail, // list of receivers
                    subject: `Password Recovery`, // Subject line
                    text: `Hi,\n
                    Your temporary recovery password is: ${tempPassword}.\n
                    Please be sure to enter a new password after logging in.`, // plain text body
                };
            
                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log(`Message ${info.messageId} sent: ${info.response}`);
                });
            });
        });
        
    //returns router back to request
    return router;
};
