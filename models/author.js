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
.get(() => {
  var fullName = '';
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
.get(() => {
  // rewriting what's in the tutorial
  let birthYear = '??';
  if (this.date_of_birth) {
    birthYear = this.date_of_birth.getYear().toString();
  }
  let deathYear = '??';
  if (this.date_of_death) {
    deathYear = this.date_of_death.getYear().toString();
  }

  const lifespanStr = `${birthYear}–${deathYear}`;
  return lifespanStr;
});

// Virtual for URL
AuthorSchema
.virtual('url')
.get(() => {
  return `/catalog/author/${this._id}`;
});

// export
module.exports = mongoose.model('Author', AuthorSchema);