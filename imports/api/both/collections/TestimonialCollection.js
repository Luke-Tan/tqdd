import { Mongo } from 'meteor/mongo';
 
export const CorrectTestimonialCollection = new Mongo.Collection('correctTestimonials');
export const WrongTestimonialCollection   = new Mongo.Collection('wrongTestimonials');