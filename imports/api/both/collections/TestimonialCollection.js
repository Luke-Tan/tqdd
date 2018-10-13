import { Mongo } from 'meteor/mongo';
 
export const CorrectTestimonialCollection = new Mongo.Collection('correctTestimonials');
export const WrongTestimonialCollection   = new Mongo.Collection('wrongTestimonials');

export const falsePositives = new Mongo.Collection('falsePositives');
export const truePositives = new Mongo.Collection('truePositives');