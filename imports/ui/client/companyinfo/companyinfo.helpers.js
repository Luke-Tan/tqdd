import { Template } from 'meteor/templating'

import './companyinfo.html'

Template.companyinfo_template.helpers({
	companyInfo(){
		return Session.get('companyInfo');
	},
	websiteInfo(){
		return Session.get('websiteInfo');
	}
})