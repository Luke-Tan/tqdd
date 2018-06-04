FlowRouter.route('/', {
  action: function () {
    BlazeLayout.render('layout', {hi:'main'});
  }
})

// FlowRouter.route('/about', {
//   action: function ()
//     BlazeLayout.render('layout2', { top: "main",bot:"content"});
//   }
// })