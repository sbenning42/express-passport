import * as jwt from 'jwt-simple';
import * as passport from 'passport';
import * as moment from 'moment';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { model as User, IUser } from '../models/user';

class Auth {

    public initialize = () => {
        passport.use('jwt', this.getStrategy());
        return passport.initialize();
    }

    public authenticated = (callback) => passport.authenticate('jwt', { session: false, failWithError: true }, callback);

    private genToken = (user: IUser): Object => {
        let expires = moment().utc().add({ days: 7 }).unix();
        let token = jwt.encode({
            exp: expires,
            email: user.email
        }, process.env.JWT_SECRET);

        return {
            token: 'JWT ' + token,
            expires: moment.unix(expires).format(),
            user: user._id
        };
    }

    public authenticate = async (req, res) => {
        try {
            req.checkBody('email', 'Invalid email').notEmpty();
            req.checkBody('password', 'Invalid password').notEmpty();

            let errors = req.validationErrors();
            if (errors) throw errors;

            let user = await User.findOne({ 'email': req.body.email }).exec();

            if (user === null) throw 'User not found';

            let success = await user.comparePassword(req.body.password);
            if (success === false) throw '';

            res.status(200).json(this.genToken(user));
        } catch (err) {
            res.status(401).json({ 'message': 'Invalid credentials', 'errors': err });
        }
    }

    private getStrategy = (): Strategy => {
        const params = {
            secretOrKey: process.env.JWT_SECRET,
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
            passReqToCallback: true
        };

        return new Strategy(params, (req, payload: any, done) => {
            User.findOne({ 'email': payload.email }, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (user === null) {
                    return done(null, false, { message: 'The user in the token was not found' });
                }

                return done(null, { _id: user._id, email: user.email });
            });
        });
    }

}

export default new Auth();