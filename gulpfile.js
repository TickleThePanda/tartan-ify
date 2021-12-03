const gulp = require('gulp');
const less = require('gulp-less');
const mocha = require('gulp-mocha');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');

const WORKER_JS_FILES = ['src/js/workers/**/*.{js,mjs}', '!src/js/workers/**/*.spec.{js,mjs}'];

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

gulp.task('test-workers', function() {
  return gulp.src('src/js/workers/**/*.spec.{js,mjs}')
    .pipe(mocha())
    .on('error', console.error);
});

gulp.task('process-workers', function() {
  return gulp.src(WORKER_JS_FILES)
    .pipe(gulp.dest('_site/js/workers/'));
});

const tsProject = ts.createProject('tsconfig.json');

gulp.task('ts', function() {
  const tsResult = tsProject.src()
    .pipe(sourcemaps.init())
    .pipe(tsProject()).js
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest('_site'));

  return tsResult;
})

gulp.task('js', gulp.series('ts', 'test-workers', 'process-workers'));

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
    .pipe(gulp.dest('_site/'));
});

gulp.task('default', gulp.parallel('html', 'css', 'js', 'images', 'audio', 'headers'));

gulp.task('watch', function() {
  gulp.watch('src/**/*.html', gulp.series('html'));
  gulp.watch('src/js/**/*.{ts,js,mjs}', gulp.series('js'));
  gulp.watch('src/_less/**/*.less', gulp.series('css'));
  gulp.watch('src/images/**/*.png)', gulp.series('images'));
  gulp.watch('src/audio/*.*', gulp.series('audio'));
});
