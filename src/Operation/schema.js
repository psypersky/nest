/* eslint-disable key-spacing, no-multi-spaces */
import mongoose from 'mongoose';
import { extend } from 'lodash';
import * as statics from './statics';

const Mixed = mongoose.Schema.Types.Mixed;

const schema = new mongoose.Schema({
  provider:     { type: String, required: true },
  route:        { type: String, required: true },
  routeId:      { type: String, required: true },
  query:        { type: String, default: '' },
  priority:     { type: Number, default: 50 },
  created:      { type: Date,   default: Date.now },

  stats: {
    pages:    { type: Number, default: 0 },
    results:  { type: Number, default: 0 },
    items:    { type: Number, default: 0 },
    updated:  { type: Number, default: 0 },
    spawned:  { type: Number, default: 0 }
  },

  state: {
    currentPage:  { type: Number,  default: 1 },
    finished:     { type: Boolean, default: false },
    finishedDate: { type: Date },
    startedDate:  { type: Date },
    lastLink:     { type: String },
    data:         { type: Mixed, default: {} }
  }
});

// Hooks
schema.pre('save', function(next) {
  this.wasNew = this.isNew;
  next();
});

// Static methods
extend(schema.statics, statics);

// Indexes
schema.index({ 'priority': -1 });
schema.index({ 'state.finished': -1 });
schema.index({ 'priority': -1, 'state.finished': -1 });

export default schema;