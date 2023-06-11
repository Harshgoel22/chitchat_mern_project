require('dotenv').config();
const {app} = require('./login_signup_server');
var nm = require('nodemailer');
let savedOTPS = {

};
var transporter = nm.createTransport(
    {
        service: 'gmail',
        auth: {
            user: `${process.env.REACT_APP_USER}`,
            pass: `${process.env.REACT_APP_PASS}`
        }
    }
);
app.post('/sendotp', (req, res) => {
    let email = req.body.email;
    let digits = '0123456789';
    let limit = 4;
    let otp = ''
    for (i = 0; i < limit; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }

    let newTime = new Date();
    let time = newTime.getHours()+":"+(newTime.getMinutes()+1)+":"+newTime.getSeconds();
    var str1=`<p>Enter the otp: ${otp} to verify your email address</p>`;

    var options = {
        from: 'hgoel1260@gmail.com',
        to: `${email}`,
        subject: "Joining ChitChat Community",
        html: `<div>${str1}<p>OTP is valid till ${time}</p></div>`

    };
    transporter.sendMail(
        options, function (error, info) {
            if (error) {
                console.log(error);
                res.status(500).send({success: "",error: "Couldn't send. Resend OTP!"})
            }
            else {
                savedOTPS[email] = otp;
                setTimeout(
                    () => {
                        delete savedOTPS.email
                    }, 60000
                )
                console.log(`Mail has been sent to ${'****'+email.slice(6)}.`);
                res.send({success: `Mail has been sent to ${'****'+email.slice(3)}. OTP is valid till ${newTime}.`,error: ""})
            }

        }
    )
})

app.post('/verify', (req, res) => {
    let otprecived = req.body.otp;
    let email = req.body.email;
    if (savedOTPS[email] == otprecived) {
        res.send({success: "Verified",error: ""});
    }
    else {
        res.status(500).send({success: "",error: "Invalid OTP"})
    }
})

module.exports = {app};