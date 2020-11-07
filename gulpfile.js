const gulp = require('gulp');
const less = require('gulp-less');

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

gulp.task('js', function() {
  return gulp.src('src/js/**/*.{js,mjs}')
    .pipe(gulp.dest('_site/js/'));
});

gulp.task('images', function() {
  return gulp.src('src/images/**.png')
    .pipe(gulp.dest('_site/images/'));
});

gulp.task('default', gulp.parallel('html', 'css', 'js', 'images'));

gulp.task('watch', function() {
  gulp.watch('src/**/*.html', gulp.series('html'));
  gulp.watch('src/js/**/*.{js,mjs}', gulp.series('js'));
  gulp.watch('src/_less/**/*.less', gulp.series('css'));
  gulp.watch('src/images/**/*.png)', gulp.series('images'));
});

