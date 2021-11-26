const GulpClient = require('gulp');
const gulp = require('gulp');
const less = require('gulp-less');
const mocha = require('gulp-mocha');

const JS_FILES = ['src/js/**/*.{js,mjs}', '!src/js/**/*.spec.{js,mjs}'];

gulp.task('css', function() {
  return gulp.src('src/_less/**/[^_]*.less')
    .pipe(less({
      math: 'strict'
    }))
    .pipe(gulp.dest('_site/css/'));
});

gulp.task('html', function() {
  return gulp.src('src/**/*.html')
    .pipe(gulp.dest('_site'));
});

gulp.task('test-js', function() {
  return gulp.src('src/js/**/*.spec.{js,mjs}')
    .pipe(mocha())
    .on('error', console.error);
});

gulp.task('process-js', function() {
  return gulp.src(JS_FILES)
    .pipe(gulp.dest('_site/js/'));
});

gulp.task('js', gulp.series('test-js', 'process-js'));

gulp.task('images', function() {
  return gulp.src('src/images/**.png')
    .pipe(gulp.dest('_site/images/'));
});

gulp.task('audio', function() {
  return gulp.src('src/audio/*.*')
    .pipe(gulp.dest('_site/audio/'));
});

gulp.task('headers', function() {
  return gulp.src('src/_headers')
    .pipe(gulp.dest('_site/_headers'));
});

gulp.task('default', gulp.parallel('html', 'css', 'js', 'images', 'audio', 'headers'));

gulp.task('watch', function() {
  gulp.watch('src/**/*.html', gulp.series('html'));
  gulp.watch('src/js/**/*.{js,mjs}', gulp.series('js'));
  gulp.watch('src/_less/**/*.less', gulp.series('css'));
  gulp.watch('src/images/**/*.png)', gulp.series('images'));
  gulp.watch('src/audio/*.*', gulp.series('audio'));
});
