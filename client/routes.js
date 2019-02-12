FlowRouter.route('/', {
  action: function () {
    BlazeLayout.render('layout', {main:'main'});
  }
})