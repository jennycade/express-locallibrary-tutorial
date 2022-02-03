const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

const async = require('async');
const { body, validationResult } = require('express-validator');

// /catalogs index page
exports.index = function (req, res) {
  async.parallel(
    {
      book_count: (callback) => {
        Book.countDocuments({}, callback);
      },
      book_instance_count: (callback) => {
        BookInstance.countDocuments({}, callback);
      },
      book_instance_available_count: (callback) => {
        BookInstance.countDocuments({ status: 'Available' }, callback);
      },
      author_count: (callback) => {
        Author.countDocuments({}, callback);
      },
      genre_count: (callback) => {
        Genre.countDocuments({}, callback);
      },
    },
    (err, results) => {
      res.render('index', {
        title: 'Local Library Home',
        error: err,
        data: results
      });
    }
  )
};

// Display list of all books.
exports.book_list = function (req, res, next) {
  Book.find({}, 'title author')  // return only title and author
    .sort({ title: 1 })           // sort by title
    .populate('author')          // get author info from _id
    .exec((err, list_books) => {
      if (err) {
        return next(err);
      }
      res.render(                // render book_list.pug
        'book_list',
        {
          title: 'Book List',
          book_list: list_books,
        }
      )
    });
};

// Display detail page for a specific book.
exports.book_detail = function (req, res, next) {
  async.parallel(
    {
      book: (callback) => {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
      },
      book_instance: (callback) => {
        BookInstance.find({ 'book': req.params.id })
          .exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        const err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }
      res.render(
        'book_detail',
        {
          title: results.book.title,
          book: results.book,
          book_instances: results.book_instance,
        }
      );
    }
  );
};

// Display book create form on GET.
exports.book_create_get = function (req, res, next) {
  // get all authors and genres
  async.parallel(
    {
      authors: (callback) => {
        Author.find(callback);
      },
      genres: (callback) => {
        Genre.find(callback);
      },
    },

    (err, results) => {
      if (err) { return next(err); }
      res.render(
        'book_form',
        {
          title: 'Create Book',
          authors: results.authors,
          genres: results.genres,
        }
      );
    }
  );
};

// Handle book create on POST.
exports.book_create_post = [

  // convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined') {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // validate and sanitize fiels
  body('title', 'Title must not be empty.')
    .trim().isLength({ min: 1 }).escape(),
  body('author', 'Author must not be empty.')
    .trim().isLength({ min: 1 }).escape(),
  body('summary', 'Summary must not be empty.')
    .trim().isLength({ min: 1 }).escape(),
  body('isbn')
    .trim().isLength({ min: 1 }).escape().withMessage('ISBN required')
    .isISBN().withMessage('ISBN is invalid'),
  body('genre.*').escape(),

  // process request
  (req, res, next) => {
    const errors = validationResult(req);

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // get authors and genres for form (again)
      async.parallel(
        {
          authors: (callback) => {
            Author.find(callback);
          },
          genres: (callback) => {
            Genre.find(callback);
          },
        },

        (err, results) => {
          if (err) { return next(err) }

          // mark selected genres as checked
          for (let i = 0; i < results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              results.genres[i].checked = 'true';
            }
          }

          res.render(
            'book_form',
            {
              title: 'Create Book',
              authors: results.authors,
              genres: results.genres,
              book: book,
              errors: errors.array(),
            }
          );
          return;
        }
      )
    } else {
      // valid form, save book
      book.save((err) => {
        if (err) { return next(err) }
        res.redirect(book.url);
      });
    }
  }
];

// Display book delete form on GET.
exports.book_delete_get = function (req, res, next) {
  async.parallel(
    {
      book: (callback) => {
        Book.findById(req.params.id).exec(callback);
      },

      book_instances: (callback) => {
        BookInstance.find({'book': req.params.id}).exec(callback);
      },
    },

    (err, results) => {
      // errors
      if (err) { return next(err); }
      if (results.book === null) {
        res.redirect('/catalog/bookinstances');
      }

      // render
      res.render(
        'book_delete',
        {
          title: 'Delete Book',
          book: results.book,
          book_instances: results.book_instances,
        }
      );
    }
  );
};

// Handle book delete on POST.
exports.book_delete_post = function (req, res, next) {
  async.parallel(
    {
      book: (callback) => {
        console.log('Getting the book');
        Book.findById(req.params.id).exec(callback);
      },

      book_instances: (callback) => {
        console.log('Getting the book instances');
        BookInstance.find({'book': req.params.id}).exec(callback);
      },
    },

    (err, results) => {
      console.log('processing delete request')
      // errors
      if (err) { return next(err); }
      if (results.book_instances.length > 0) {
        // still copies. render as GET
        res.render(
          'book_delete',
          {
            title: 'Delete Book',
            book: results.book,
            book_instances: results.book_instances,
          }
        );
        return;
      } else {
        // no copies, okay to delete
        Book.findByIdAndRemove(
          req.body.bookid,
          (err) => {
            if (err) { return next(err); }
            res.redirect('/catalog/books');
          }
        )
      }
    }
  );
};

// Display book update form on GET.
exports.book_update_get = function (req, res, next) {
  async.parallel(
    {
      book: (callback) => {
        Book.findById(req.params.id)
          .populate('author').populate('genre')
          .exec(callback);
      },
      authors: (callback) => {
        Author.find(callback);
      },
      genres: (callback) => {
        Genre.find(callback);
      },
    },

    (err, results) => {
      if (err) { return next(err) }
      if (results.book === null) {
        const err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }

      // mark selected genres
      for (let i = 0; i < results.genres.length; i++) {
        for (let j = 0; j < results.book.genre.length; j++) {
          if (results.genres[i]._id.toString() ===
            results.book.genre[j]._id.toString()
          ) {
            results.genres[i].checked = true;
          }
        }
      }

      res.render(
        'book_form',
        {
          title: 'Update book',
          authors: results.authors,
          genres: results.genres,
          book: results.book,
        }
      );
    }
  );
};

// Handle book update on POST.
exports.book_update_post = [
  // genre -> array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined') {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // validate and sanitize form data
  body('title', 'Title must not be empty')
    .trim().isLength({ min: 1 }).escape(),
  body('author', 'Author must not be empty')
    .trim().isLength({ min: 1 }).escape(),
  body('summary', 'Summary must not be empty')
    .trim().isLength({ min: 1 }).escape(),
  body('isbn')
    .trim().isLength({ min: 1 }).escape().withMessage('ISBN must not be empty')
    .isISBN().withMessage('ISBN must be valid'),
  body('genre.*').escape(),

  // process request
  (req, res, next) => {
    const errors = validationResult(req);

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      _id: req.params.id,
      genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
    });

    if (!errors.isEmpty()) {
      async.parallel(
        {
          authors: (callback) => {
            Author.find(callback);
          },
          genres: (callback) => {
            Genre.find(callback);
          },
        },

        (err, results) => {
          if (err) { return next(err) }

          // mark selected genres as checked
          for (let i = 0; i < results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              results.genres[i].checked = true;
            }
          }

          // render form again
          res.render(
            'book_form',
            {
              title: 'Update Book',
              authors: results.authors,
              genres: results.genres,
              book: book,
              errors: errors.array()
            }
          );
          return;
        }
      );
    } else {
      Book.findByIdAndUpdate(req.params.id, book, {}, (err, updated_book) => {
        if (err) { return next(err); }

        res.redirect(updated_book.url);
      });
    }
  }
];

// Handle book update on POST
exports.book_update_post_that_works = [

  // Convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined')
        req.body.genre = [];
      else
        req.body.genre = new Array(req.body.genre);
    }
    next();
  },

  // Validate and sanitize fields.
  body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
  body('genre.*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    var book = new Book(
      {
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
        _id: req.params.id //This is required, or a new ID will be assigned!
      });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      async.parallel({
        authors: function (callback) {
          Author.find(callback);
        },
        genres: function (callback) {
          Genre.find(callback);
        },
      }, function (err, results) {
        if (err) { return next(err); }

        // Mark our selected genres as checked.
        for (let i = 0; i < results.genres.length; i++) {
          if (book.genre.indexOf(results.genres[i]._id) > -1) {
            results.genres[i].checked = 'true';
          }
        }
        res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
      });
      return;
    }
    else {
      // Data from form is valid. Update the record.
      Book.findByIdAndUpdate(req.params.id, book, {}, function (err, thebook) {
        if (err) { return next(err); }
        // Successful - redirect to book detail page.
        res.redirect(thebook.url);
      });
    }
  }
];