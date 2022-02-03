const { DateTime } = require('luxon');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema(
  {
    first_name: {
      type: String,
      required: true,
      maxlength: 100
    },
    family_name: {
      type: String,
      required: true,
      maxlength: 100
    },
    date_of_birth: {type: Date},
    date_of_death: {type: Date},
  }
);

// Virtual field: author's full name
AuthorSchema
.virtual('name')
.get(function() {
  let fullName = '';
  if (this.first_name && this.family_name) {
    fullName = `${this.family_name}, ${this.first_name}`;
  }
  if (!this.first_name || !this.family_name) { // return an empty string so the exception can be handled elsewhere if either is missing
    fullName = '';
  }
  return fullName;
})

// Virtual for lifespan
AuthorSchema
.virtual('lifespan')
.get(function() {
  // rewriting what's in the tutorial
  let birthYear = '??';
  if (this.date_of_birth) {
    birthYear = this.date_of_birth.getFullYear().toString();
  }
  let deathYear = '??';
  if (this.date_of_death) {
    deathYear = this.date_of_death.getFullYear().toString();
  }

  const lifespanStr = `${birthYear}–${deathYear}`;
  return lifespanStr;
});

// Virtual for URL
AuthorSchema
.virtual('url')
.get(function() {
  return `/catalog/author/${this._id}`;
});

// Virtual for ISO-formatted dates
AuthorSchema
.virtual('date_of_birth_ISO')
.get(function() {
  return DateTime.fromJSDate(this.date_of_birth).toISODate();
});

AuthorSchema
.virtual('date_of_death_ISO')
.get(function() {
  return DateTime.fromJSDate(this.date_of_death).toISODate();
});

// export
module.exports = mongoose.model('Author', AuthorSchema);