const passportJWT = require('passport-jwt');
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const User = require('../../models/index').Users;

module.exports =
    new JWTStrategy(
        {
            jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
            secretOrKey: 'your_jwt_secret'
        },
        function (jwtPayload, cb) {

            if(jwtPayload.user_type !== '2'&& jwtPayload.user_type !== '0'){
                cb("Unauthorized");
            }

            User.findOne({where: {username: jwtPayload.username}})
                .then(user => {
                    return cb(null, user);
                })
                .catch(err => {
                    return cb(err);
                })
        }
    );