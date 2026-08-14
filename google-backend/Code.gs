/** Queshift Google Apps Script backend. Bind this project to the Queshift Google Sheet. */
var QS_ADMIN_EMAIL = 'info.queshift@gmail.com';
var QS_HEADERS = {
  SETTINGS:['KEY','VALUE','UPDATED_AT'],
  USERS:['GOOGLE_ID','EMAIL','NAME','COMPANY','PHONE','ADDRESS','STATE','PIN','GSTIN','CREATED_AT','UPDATED_AT'],
  PARTNERS:['ID','NAME','ROLE','BIO','IMAGE_URL','SORT_ORDER','ACTIVE','UPDATED_AT'],
  BANNERS:['ID','TITLE','IMAGE_URL','LINK','SORT_ORDER','ACTIVE','UPDATED_AT'],
  BRANDS:['ID','NAME','IMAGE_URL','URL','SORT_ORDER','ACTIVE','UPDATED_AT'],
  VIDEOS:['ID','URL','VIDEO_ID','TITLE','DESCRIPTION','THUMBNAIL','FEATURED','ACTIVE','UPDATED_AT'],
  BLOGS:['ID','SLUG','TITLE','SUMMARY','HTML','IMAGE_URL','META_TITLE','META_DESCRIPTION','KEYWORDS','TAGS','STATUS','PUBLISHED_AT','UPDATED_AT'],
  COMMENTS:['ID','BLOG_SLUG','USER_EMAIL','NAME','COMMENT','STATUS','REPLY','CREATED_AT','UPDATED_AT'],
  REVIEWS:['ID','USER_EMAIL','NAME','RATING','COMMENT','STATUS','REPLY','CREATED_AT','UPDATED_AT'],
  PLANS:['CODE','NAME','BASE_PRICE','GST_RATE','DAYS','ACTIVE'],
  PAYMENTS:['ORDER_ID','USER_EMAIL','NAME','PHONE','STATE','PLAN','BASE_AMOUNT','GST_AMOUNT','TOTAL_AMOUNT','UTR','PAYMENT_DATE','SCREENSHOT_FILE_ID','SCREENSHOT_URL','STATUS','NOTES','CREATED_AT','UPDATED_AT'],
  SUBSCRIPTIONS:['ID','USER_EMAIL','PLAN','START_DATE','EXPIRY_DATE','STATUS','ORDER_ID','DOWNLOAD_URL','UPDATED_AT'],
  INVOICES:['INVOICE_ID','INVOICE_NUMBER','ORDER_ID','DATE','USER_EMAIL','CUSTOMER_NAME','COMPANY','PHONE','ADDRESS','STATE','STATE_CODE','PIN','GSTIN','PLAN','START_DATE','EXPIRY_DATE','TAXABLE','CGST','SGST','IGST','TOTAL','AMOUNT_WORDS','PDF_FILE_ID','PDF_URL','CREATED_AT'],
  INVOICE_ITEMS:['INVOICE_NUMBER','SERIAL_NO','DESCRIPTION','SAC_CODE','QTY','RATE','TAXABLE','GST_RATE','TOTAL'],
  AUDIT_LOG:['ID','EMAIL','ACTION','DETAILS','CREATED_AT']
};

function initQueshiftSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  Object.keys(QS_HEADERS).forEach(function(name){ ensureSheet_(ss,name,QS_HEADERS[name]); });
  seedSetting_('ADMIN_EMAIL',QS_ADMIN_EMAIL); seedSetting_('HERO_TITLE','Every order matched. Every rupee accounted for.');
  seedSetting_('HERO_TEXT','Maintain e-commerce accounts, reconcile settlements and understand exact order-wise calculation across every major marketplace.');
  seedSetting_('PHONE1','9310907124'); seedSetting_('PHONE2','9310907125'); seedSetting_('EMAIL','info.queshift@gmail.com');
  seedSetting_('GST_RATE','18'); seedSetting_('SUPPLIER_STATE','Delhi'); seedSetting_('SELLER_NAME','AW TAXATION - QUESHIFT');
  seedSetting_('SELLER_ADDRESS','B-173, Katyani Vihar, Rajeev Nagar Extn., Begumpur, Delhi - 110086'); seedSetting_('SELLER_GSTIN',''); seedSetting_('SAC_CODE','998314');
  seedSetting_('MSME',''); seedSetting_('BANK_NAME',''); seedSetting_('BANK_ACCOUNT',''); seedSetting_('IFSC',''); seedSetting_('SOFTWARE_FILE_ID',''); seedSetting_('FAVICON_URL',''); seedSetting_('FAVICON_FILE_ID','');
  seedSetting_('SOCIAL_JSON',JSON.stringify({awtaxation:'https://www.awtaxation.com/',whatsapp:'https://wa.me/919310907124'}));
  var plans = sheet_('PLANS'); if (plans.getLastRow() < 2) {
    appendObject_('PLANS',{CODE:'MONTHLY',NAME:'Monthly',BASE_PRICE:2500,GST_RATE:18,DAYS:30,ACTIVE:true});
    appendObject_('PLANS',{CODE:'HALF_YEARLY',NAME:'Half-Yearly',BASE_PRICE:14500,GST_RATE:18,DAYS:182,ACTIVE:true});
    appendObject_('PLANS',{CODE:'YEARLY',NAME:'Yearly',BASE_PRICE:24000,GST_RATE:18,DAYS:365,ACTIVE:true});
  }
  var root = getOrCreateFolder_(DriveApp.getRootFolder(),'Queshift Website Data');
  ['Public Media','Payment Screenshots','Invoices','Software'].forEach(function(n){ getOrCreateFolder_(root,n); });
  setSetting_('ROOT_FOLDER_ID',root.getId());
  return 'Queshift system ready: ' + ss.getUrl();
}

function doGet(e) {
  try {
    var action = (e && e.parameter.action) || 'publicData', data;
    if (action === 'publicData') data = publicData_();
    else if (action === 'blogs') data = publicBlogs_();
    else if (action === 'blog') data = publicBlog_(e.parameter.slug || '');
    else if (action === 'health') data = {status:'ok',time:new Date().toISOString()};
    else throw new Error('Unknown public action.');
    return output_({ok:true,data:data},e && e.parameter.callback);
  } catch (err) { return output_({ok:false,message:err.message},e && e.parameter.callback); }
}

function doPost(e) {
  try {
    var action = e.parameter.action || '', payload = parseJson_(e.parameter.payload,'{}'), credential = e.parameter.credential || '', data;
    if (action === 'contact') data = contact_(payload);
    else if (action === 'login') data = login_(credential,false);
    else if (action === 'adminLogin') data = login_(credential,true);
    else if (action === 'logout') data = logoutSession_(credential);
    else {
      var identity = verifyCredential_(credential);
      if (action === 'saveProfile') data = saveProfile_(identity,payload);
      else if (action === 'userDashboard') data = userDashboard_(identity);
      else if (action === 'paymentAttempt') data = paymentAttempt_(identity,payload);
      else if (action === 'submitComment') data = submitComment_(identity,payload);
      else if (action === 'submitReview') data = submitReview_(identity,payload);
      else {
        requireAdmin_(identity);
        if (action === 'adminDashboard') data = adminDashboard_();
        else if (action === 'saveSettings') data = saveSettings_(payload);
        else if (action === 'saveSocial') data = saveSocial_(payload);
        else if (action === 'saveBanner') data = saveBanner_(payload);
        else if (action === 'savePartner') data = savePartner_(payload);
        else if (action === 'saveBrand') data = saveBrand_(payload);
        else if (action === 'saveVideo') data = saveVideo_(payload);
        else if (action === 'saveBlog') data = saveBlog_(payload);
        else if (action === 'deleteContent') data = deleteContent_(payload);
        else if (action === 'approvePayment') data = approvePayment_(identity,payload);
        else if (action === 'rejectPayment') data = updatePaymentStatus_(payload.orderId,'REJECTED');
        else if (action === 'reviewAction') data = reviewAction_(payload);
        else throw new Error('Unknown action.');
      }
    }
    return output_({ok:true,data:data});
  } catch (err) { return output_({ok:false,message:err.message}); }
}

function publicData_() {
  return {
    heroTitle:getSetting_('HERO_TITLE'), heroText:getSetting_('HERO_TEXT'), phone1:getSetting_('PHONE1'), phone2:getSetting_('PHONE2'), email:getSetting_('EMAIL'),
    logoUrl:publicMediaUrl_(getSetting_('LOGO_URL') || getSetting_('LOGO_FILE_ID')), faviconUrl:publicMediaUrl_(getSetting_('FAVICON_URL') || getSetting_('FAVICON_FILE_ID')), qrUrl:publicMediaUrl_(getSetting_('QR_URL') || getSetting_('QR_FILE_ID')), gstRate:+getSetting_('GST_RATE')||18, social:parseJson_(getSetting_('SOCIAL_JSON'),'{}'),
    plans:rows_('PLANS').filter(active_).map(function(r){return{code:r.CODE,name:r.NAME,price:+r.BASE_PRICE,days:+r.DAYS};}),
    banners:rows_('BANNERS').filter(active_).sort(sort_).map(function(r){return{id:r.ID,title:r.TITLE,imageUrl:publicMediaUrl_(r.IMAGE_URL),link:r.LINK,active:bool_(r.ACTIVE)};}),
    partners:rows_('PARTNERS').filter(active_).sort(sort_).map(function(r){return{id:r.ID,name:r.NAME,role:r.ROLE,bio:r.BIO,imageUrl:publicMediaUrl_(r.IMAGE_URL)};}),
    brands:rows_('BRANDS').filter(active_).sort(sort_).map(function(r){return{id:r.ID,name:r.NAME,imageUrl:publicMediaUrl_(r.IMAGE_URL),url:r.URL};}),
    videos:rows_('VIDEOS').filter(active_).map(function(r){return{id:r.ID,url:r.URL,videoId:r.VIDEO_ID,title:r.TITLE,description:r.DESCRIPTION,thumbnail:r.THUMBNAIL,featured:bool_(r.FEATURED),active:bool_(r.ACTIVE)};})
  };
}

function publicBlogs_() {
  return rows_('BLOGS').filter(function(r){return String(r.STATUS).toUpperCase()==='PUBLISHED';}).sort(function(a,b){return new Date(b.PUBLISHED_AT)-new Date(a.PUBLISHED_AT);}).map(function(r){return blogPublic_(r,false);});
}
function publicBlog_(slug) {
  var row = rows_('BLOGS').filter(function(r){return r.SLUG===slug && String(r.STATUS).toUpperCase()==='PUBLISHED';})[0]; if(!row) throw new Error('Blog not found.');
  var b=blogPublic_(row,true); b.comments=rows_('COMMENTS').filter(function(c){return c.BLOG_SLUG===slug&&c.STATUS==='APPROVED';}).map(function(c){return{name:c.NAME,comment:c.COMMENT,reply:c.REPLY};}); return b;
}
function blogPublic_(r,full){var o={id:r.ID,slug:r.SLUG,title:r.TITLE,summary:r.SUMMARY,imageUrl:publicMediaUrl_(r.IMAGE_URL),metaTitle:r.META_TITLE,metaDescription:r.META_DESCRIPTION,keywords:r.KEYWORDS,tags:r.TAGS,date:formatDate_(r.PUBLISHED_AT),isoDate:new Date(r.PUBLISHED_AT||r.UPDATED_AT).toISOString()};if(full)o.html=r.HTML;return o;}

function login_(credential,adminOnly) {
  var id=verifyGoogleToken_(credential), admin=String(id.email).toLowerCase()===String(getSetting_('ADMIN_EMAIL')||QS_ADMIN_EMAIL).toLowerCase();
  if(adminOnly&&!admin)throw new Error('This Google account is not authorised for admin access.');
  var user=findOne_('USERS','EMAIL',id.email); if(!user)appendObject_('USERS',{GOOGLE_ID:id.sub,EMAIL:id.email,NAME:id.name||'',COMPANY:'',PHONE:'',ADDRESS:'',STATE:'',PIN:'',GSTIN:'',CREATED_AT:now_(),UPDATED_AT:now_()});
  var role=admin?'ADMIN':'CUSTOMER',sessionToken=createSession_(id,role);return{email:id.email,name:id.name||'',picture:id.picture||'',role:role,profileComplete:!!(user&&user.PHONE&&user.STATE),sessionToken:sessionToken};
}
function verifyGoogleToken_(token) {
  if(!token)throw new Error('Google login is required.'); var clientId=PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID'); if(!clientId)throw new Error('GOOGLE_CLIENT_ID is not configured in Apps Script.');
  var res=UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(token),{muteHttpExceptions:true}); if(res.getResponseCode()!==200)throw new Error('Google login token is invalid or expired.');
  var id=JSON.parse(res.getContentText()); if(id.aud!==clientId)throw new Error('Google token audience mismatch.'); if(String(id.email_verified)!=='true')throw new Error('Google email is not verified.'); return id;
}
function verifyCredential_(token){if(String(token||'').indexOf('qss_')===0)return verifySession_(token);return verifyGoogleToken_(token);}
function createSession_(id,role){var token='qss_'+Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''),data={email:id.email,name:id.name||'',sub:id.sub||'',picture:id.picture||'',role:role||'CUSTOMER',createdAt:new Date().toISOString()};PropertiesService.getScriptProperties().setProperty('SESSION_'+token,JSON.stringify(data));return token;}
function verifySession_(token){if(!token)throw new Error('Login is required.');var raw=PropertiesService.getScriptProperties().getProperty('SESSION_'+token);if(!raw)throw new Error('Your Queshift session is not active. Please login again.');var id=parseJson_(raw,'{}');if(!id.email)throw new Error('Your Queshift session is invalid. Please login again.');return id;}
function logoutSession_(token){if(String(token||'').indexOf('qss_')===0)PropertiesService.getScriptProperties().deleteProperty('SESSION_'+token);return{loggedOut:true};}
function requireAdmin_(id){if(String(id.email).toLowerCase()!==String(getSetting_('ADMIN_EMAIL')||QS_ADMIN_EMAIL).toLowerCase())throw new Error('Admin authorisation required.');}

function saveProfile_(id,p) {
  if(!p.name||!p.phone||!p.address||!p.state||!p.pin)throw new Error('Please complete all required profile fields.');
  upsertObject_('USERS','EMAIL',id.email,{GOOGLE_ID:id.sub,EMAIL:id.email,NAME:clean_(p.name),COMPANY:clean_(p.company),PHONE:digits_(p.phone),ADDRESS:clean_(p.address),STATE:clean_(p.state),PIN:digits_(p.pin),GSTIN:String(p.gstin||'').toUpperCase().trim(),UPDATED_AT:now_(),CREATED_AT:now_()}); audit_(id.email,'SAVE_PROFILE','Customer profile updated'); return{saved:true};
}
function userDashboard_(id) {
  var u=findOne_('USERS','EMAIL',id.email)||{}, sub=latest_('SUBSCRIPTIONS','USER_EMAIL',id.email), pay=latest_('PAYMENTS','USER_EMAIL',id.email);
  return{user:userPublic_(u),subscription:sub?{plan:sub.PLAN,start:formatDate_(sub.START_DATE),expiry:formatDate_(sub.EXPIRY_DATE),status:sub.STATUS}:null,latestPayment:pay?{orderId:pay.ORDER_ID,status:pay.STATUS}:null,downloadUrl:sub&&sub.STATUS==='ACTIVE'?sub.DOWNLOAD_URL:'',invoices:rows_('INVOICES').filter(function(r){return r.USER_EMAIL===id.email;}).map(function(r){return{invoiceNumber:r.INVOICE_NUMBER,date:formatDate_(r.DATE),total:r.TOTAL,pdfUrl:r.PDF_URL};})};
}
function userPublic_(u){return{email:u.EMAIL||'',name:u.NAME||'',company:u.COMPANY||'',phone:u.PHONE||'',address:u.ADDRESS||'',state:u.STATE||'',pin:u.PIN||'',gstin:u.GSTIN||''};}

function paymentAttempt_(id,p) {
  var user=findOne_('USERS','EMAIL',id.email); if(!user||!user.PHONE||!user.STATE)throw new Error('Complete your customer profile before payment.');
  var plan=findOne_('PLANS','CODE',p.plan); if(!plan||!bool_(plan.ACTIVE))throw new Error('Invalid subscription plan.'); if(!p.screenshot)throw new Error('Payment screenshot is required.');
  if(p.gstin){upsertObject_('USERS','EMAIL',id.email,{GSTIN:String(p.gstin).toUpperCase().trim(),UPDATED_AT:now_()});user=findOne_('USERS','EMAIL',id.email);}
  var gstRate=+getSetting_('GST_RATE')||+plan.GST_RATE||18,gst=round_(+plan.BASE_PRICE*(gstRate/100)),total=round_(+plan.BASE_PRICE+gst),orderId='QS'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss');
  var file=saveDataUrl_(p.screenshot,'Payment-'+orderId,getSubfolder_('Payment Screenshots'),false);
  appendObject_('PAYMENTS',{ORDER_ID:orderId,USER_EMAIL:id.email,NAME:user.NAME,PHONE:user.PHONE,STATE:user.STATE,PLAN:plan.CODE,BASE_AMOUNT:plan.BASE_PRICE,GST_AMOUNT:gst,TOTAL_AMOUNT:total,UTR:clean_(p.utr),PAYMENT_DATE:p.paymentDate,SCREENSHOT_FILE_ID:file.id,SCREENSHOT_URL:file.url,STATUS:'PENDING',NOTES:clean_(p.notes),CREATED_AT:now_(),UPDATED_AT:now_()});
  MailApp.sendEmail({to:getSetting_('ADMIN_EMAIL')||QS_ADMIN_EMAIL,subject:'Queshift payment attempt - '+orderId,htmlBody:'<h2>New payment submitted</h2><p><b>Customer:</b> '+html_(user.NAME)+'</p><p><b>Phone:</b> '+html_(user.PHONE)+'</p><p><b>State:</b> '+html_(user.STATE)+'</p><p><b>Plan:</b> '+html_(plan.NAME)+'</p><p><b>Amount:</b> ₹'+total+'</p><p><b>Order ID:</b> '+orderId+'</p><p>Open Queshift Admin Panel to view proof and approve.</p>'}); audit_(id.email,'PAYMENT_ATTEMPT',orderId); return{orderId:orderId,status:'PENDING',total:total};
}

function adminDashboard_() {
  var settings=settingsObject_(), users=rows_('USERS'), payments=rows_('PAYMENTS'), subs=rows_('SUBSCRIPTIONS'), blogs=rows_('BLOGS'), invoices=rows_('INVOICES');
  return{settings:{heroTitle:settings.HERO_TITLE,heroText:settings.HERO_TEXT,phone1:settings.PHONE1,phone2:settings.PHONE2,email:settings.EMAIL,gstRate:settings.GST_RATE,supplierState:settings.SUPPLIER_STATE,sellerName:settings.SELLER_NAME,sellerAddress:settings.SELLER_ADDRESS,sellerGstin:settings.SELLER_GSTIN,sacCode:settings.SAC_CODE,bankName:settings.BANK_NAME,bankAccount:settings.BANK_ACCOUNT,ifsc:settings.IFSC,msme:settings.MSME,logoUrl:publicMediaUrl_(settings.LOGO_URL||settings.LOGO_FILE_ID),faviconUrl:publicMediaUrl_(settings.FAVICON_URL||settings.FAVICON_FILE_ID),qrUrl:publicMediaUrl_(settings.QR_URL||settings.QR_FILE_ID)},social:parseJson_(settings.SOCIAL_JSON,'{}'),counts:{customers:users.length,pendingPayments:payments.filter(function(p){return p.STATUS==='PENDING';}).length,activeSubscriptions:subs.filter(function(s){return s.STATUS==='ACTIVE';}).length,publishedBlogs:blogs.filter(function(b){return b.STATUS==='PUBLISHED';}).length},banners:publicData_().banners,partners:publicData_().partners,brands:publicData_().brands,videos:publicData_().videos,blogs:blogs.map(function(b){return{id:b.ID,title:b.TITLE,slug:b.SLUG,status:b.STATUS};}),payments:payments.slice().reverse().map(function(p){return{orderId:p.ORDER_ID,name:p.NAME,phone:p.PHONE,state:p.STATE,plan:p.PLAN,amount:p.TOTAL_AMOUNT,screenshotUrl:p.SCREENSHOT_URL,status:p.STATUS};}),reviews:rows_('REVIEWS').concat(rows_('COMMENTS').map(function(c){return{ID:c.ID,NAME:c.NAME,RATING:0,COMMENT:'Blog '+c.BLOG_SLUG+': '+c.COMMENT,STATUS:c.STATUS,REPLY:c.REPLY};})).map(function(r){return{id:r.ID,name:r.NAME,rating:r.RATING,comment:r.COMMENT,status:r.STATUS,reply:r.REPLY};}),customers:users.map(function(u){var s=latest_('SUBSCRIPTIONS','USER_EMAIL',u.EMAIL);return{name:u.NAME,email:u.EMAIL,phone:u.PHONE,state:u.STATE,plan:s?s.PLAN:''};}),invoices:invoices.slice().reverse().map(function(i){return{invoiceNumber:i.INVOICE_NUMBER,customer:i.CUSTOMER_NAME,total:i.TOTAL,pdfUrl:i.PDF_URL};})};
}

function saveSettings_(p) {
  var map={heroTitle:'HERO_TITLE',heroText:'HERO_TEXT',phone1:'PHONE1',phone2:'PHONE2',email:'EMAIL',gstRate:'GST_RATE',supplierState:'SUPPLIER_STATE',sellerName:'SELLER_NAME',sellerAddress:'SELLER_ADDRESS',sellerGstin:'SELLER_GSTIN',sacCode:'SAC_CODE',bankName:'BANK_NAME',bankAccount:'BANK_ACCOUNT',ifsc:'IFSC',msme:'MSME'};
  Object.keys(map).forEach(function(k){if(p[k]!==undefined&&p[k]!=='')setSetting_(map[k],clean_(p[k]));});
  if(p.logo){var logo=saveDataUrl_(p.logo,'Queshift-Logo',getSubfolder_('Public Media'),true);setSetting_('LOGO_URL',logo.publicUrl);setSetting_('LOGO_FILE_ID',logo.id);} if(p.favicon){var fav=saveDataUrl_(p.favicon,'Queshift-Favicon',getSubfolder_('Public Media'),true);setSetting_('FAVICON_URL',fav.publicUrl);setSetting_('FAVICON_FILE_ID',fav.id);}
  if(p.qr){var qr=saveDataUrl_(p.qr,'Payment-QR',getSubfolder_('Public Media'),true);setSetting_('QR_FILE_ID',qr.id);setSetting_('QR_URL',qr.publicUrl);}
  if(p.signature){var sig=saveDataUrl_(p.signature,'Authorised-Signature',getSubfolder_('Public Media'),true);setSetting_('SIGNATURE_FILE_ID',sig.id);}
  return{saved:true};
}
function saveSocial_(p){var social={},standard=['youtube','instagram','facebook','linkedin','twitter','awtaxation','whatsapp'];standard.forEach(function(k){social[k]=clean_(p[k]);});social.custom=[];[1,2].forEach(function(i){if(p['customUrl'+i])social.custom.push({label:clean_(p['customLabel'+i])||'Link',icon:clean_(p['customLabel'+i]).slice(0,2)||'+',url:clean_(p['customUrl'+i])});});setSetting_('SOCIAL_JSON',JSON.stringify(social));return{saved:true};}
function saveBanner_(p){var f=saveDataUrl_(p.image,'Banner-'+Date.now(),getSubfolder_('Public Media'),true);appendObject_('BANNERS',{ID:uuid_(),TITLE:clean_(p.title),IMAGE_URL:f.publicUrl,LINK:clean_(p.link),SORT_ORDER:+p.sortOrder||1,ACTIVE:bool_(p.active),UPDATED_AT:now_()});return{saved:true};}
function savePartner_(p){var name=clean_(p.name);if(!name)throw new Error('Partner name is required.');var existing=findOne_('PARTNERS','NAME',name),imageUrl=existing?existing.IMAGE_URL:'';if(p.image)imageUrl=saveDataUrl_(p.image,'Partner-'+name,getSubfolder_('Public Media'),true).publicUrl;var role=clean_(p.role)||(existing&&existing.ROLE)||'Co-Owner, Queshift',bio=(p.bio===undefined||p.bio===null)?((existing&&existing.BIO)||''):clean_(p.bio);upsertObject_('PARTNERS','NAME',name,{ID:existing?existing.ID:uuid_(),NAME:name,ROLE:role,BIO:bio,IMAGE_URL:imageUrl,SORT_ORDER:existing?(+existing.SORT_ORDER||1):rows_('PARTNERS').length+1,ACTIVE:true,UPDATED_AT:now_()});return{saved:true,updated:!!existing};}
function saveBrand_(p){var f=p.image?saveDataUrl_(p.image,'Brand-'+clean_(p.name),getSubfolder_('Public Media'),true):{publicUrl:''};appendObject_('BRANDS',{ID:uuid_(),NAME:clean_(p.name),IMAGE_URL:f.publicUrl,URL:clean_(p.url),SORT_ORDER:+p.sortOrder||1,ACTIVE:true,UPDATED_AT:now_()});return{saved:true};}
function saveVideo_(p){var id=parseVideoId_(p.url);if(!id)throw new Error('Enter a valid YouTube video link.');var meta=youtubeMeta_(id),featured=bool_(p.featured);if(featured)rowsWithNumbers_('VIDEOS').forEach(function(x){if(bool_(x.obj.FEATURED)){sheet_('VIDEOS').getRange(x.row,7).setValue(false);}});appendObject_('VIDEOS',{ID:uuid_(),URL:p.url,VIDEO_ID:id,TITLE:clean_(p.title)||meta.title,DESCRIPTION:clean_(p.description)||meta.description,THUMBNAIL:meta.thumbnail,FEATURED:featured,ACTIVE:bool_(p.active),UPDATED_AT:now_()});return{saved:true};}
function saveBlog_(p){var slug=slugify_(p.slug||p.title),existing=findOne_('BLOGS','SLUG',slug),imageUrl=existing?existing.IMAGE_URL:'';if(p.image)imageUrl=saveDataUrl_(p.image,'Blog-'+slug,getSubfolder_('Public Media'),true).publicUrl;upsertObject_('BLOGS','SLUG',slug,{ID:existing?existing.ID:uuid_(),SLUG:slug,TITLE:clean_(p.title),SUMMARY:clean_(p.summary),HTML:sanitizeHtml_(p.html),IMAGE_URL:imageUrl,META_TITLE:clean_(p.metaTitle)||clean_(p.title),META_DESCRIPTION:clean_(p.metaDescription)||clean_(p.summary),KEYWORDS:clean_(p.keywords),TAGS:clean_(p.tags),STATUS:p.status==='DRAFT'?'DRAFT':'PUBLISHED',PUBLISHED_AT:existing?existing.PUBLISHED_AT:now_(),UPDATED_AT:now_()});return{saved:true,slug:slug};}
function deleteContent_(p){var allowed=['BANNERS','PARTNERS','BRANDS','VIDEOS','BLOGS','REVIEWS','COMMENTS'];if(allowed.indexOf(p.type)<0)throw new Error('Invalid content type.');deleteBy_((p.type==='COMMENTS'?'COMMENTS':p.type),'ID',p.id);return{deleted:true};}

function approvePayment_(admin,p) {
  var payment=findOne_('PAYMENTS','ORDER_ID',p.orderId);if(!payment||payment.STATUS!=='PENDING')throw new Error('Pending payment not found.');var plan=findOne_('PLANS','CODE',p.plan==='CUSTOM'?payment.PLAN:p.plan)||findOne_('PLANS','CODE',payment.PLAN);var days=p.plan==='CUSTOM'?+p.days:+plan.DAYS;if(!days||days<1)throw new Error('Enter valid subscription days.');
  var start=new Date(),expiry=new Date(start.getTime()+days*86400000),softwareId=getSetting_('SOFTWARE_FILE_ID'),downloadUrl='';if(softwareId){var sw=DriveApp.getFileById(softwareId);sw.addViewer(payment.USER_EMAIL);downloadUrl=sw.getUrl();}
  upsertObject_('SUBSCRIPTIONS','USER_EMAIL',payment.USER_EMAIL,{ID:uuid_(),USER_EMAIL:payment.USER_EMAIL,PLAN:p.plan==='CUSTOM'?'CUSTOM '+days+' DAYS':plan.NAME,START_DATE:start,EXPIRY_DATE:expiry,STATUS:'ACTIVE',ORDER_ID:payment.ORDER_ID,DOWNLOAD_URL:downloadUrl,UPDATED_AT:now_()});updatePaymentStatus_(payment.ORDER_ID,'APPROVED');
  var invoice=generateInvoice_(payment,plan,start,expiry),attachment=DriveApp.getFileById(invoice.fileId).getBlob();
  MailApp.sendEmail({to:payment.USER_EMAIL,subject:'Welcome to Queshift - '+payment.ORDER_ID,htmlBody:'<div style="font-family:Arial;padding:24px;color:#102039"><h1 style="color:#075bb8">Welcome to Queshift!</h1><p>Hello '+html_(payment.NAME)+', your subscription is now active.</p><p><b>Order ID:</b> '+payment.ORDER_ID+'<br><b>Plan:</b> '+html_(p.plan==='CUSTOM'?'Custom '+days+' days':plan.NAME)+'<br><b>Valid until:</b> '+formatDate_(expiry)+'</p><p>We will connect you shortly. Support: 9310907124, 9310907125</p><p>Your GST invoice is attached.</p></div>',attachments:[attachment],name:'Queshift by AW Taxation',replyTo:getSetting_('EMAIL')||QS_ADMIN_EMAIL});audit_(admin.email,'APPROVE_PAYMENT',payment.ORDER_ID);return{approved:true,invoice:invoice.invoiceNumber};
}
function updatePaymentStatus_(orderId,status){var x=findRow_('PAYMENTS','ORDER_ID',orderId);if(!x)throw new Error('Payment not found.');sheet_('PAYMENTS').getRange(x.row,14).setValue(status);sheet_('PAYMENTS').getRange(x.row,17).setValue(now_());return{status:status};}
function generateInvoice_(payment,plan,start,expiry) {
  var user=findOne_('USERS','EMAIL',payment.USER_EMAIL),taxable=+payment.BASE_AMOUNT,rate=+getSetting_('GST_RATE')||+plan.GST_RATE||18,same=String(user.STATE).toLowerCase()===String(getSetting_('SUPPLIER_STATE')||'Delhi').toLowerCase(),cgst=same?round_(taxable*rate/200):0,sgst=cgst,igst=same?0:round_(taxable*rate/100),total=round_(taxable+cgst+sgst+igst),invoiceNumber=nextInvoiceNumber_(),invoiceId=uuid_(),stateCode=stateCode_(user.STATE),html=invoiceHtml_({invoiceNumber:invoiceNumber,date:new Date(),payment:payment,user:user,plan:plan,start:start,expiry:expiry,taxable:taxable,rate:rate,cgst:cgst,sgst:sgst,igst:igst,total:total,stateCode:stateCode});
  var blob=Utilities.newBlob(html,'text/html',invoiceNumber.replace(/\//g,'-')+'.html').getAs(MimeType.PDF).setName(invoiceNumber.replace(/\//g,'-')+'.pdf'),file=getSubfolder_('Invoices').createFile(blob);file.addViewer(payment.USER_EMAIL);
  appendObject_('INVOICES',{INVOICE_ID:invoiceId,INVOICE_NUMBER:invoiceNumber,ORDER_ID:payment.ORDER_ID,DATE:new Date(),USER_EMAIL:payment.USER_EMAIL,CUSTOMER_NAME:user.NAME,COMPANY:user.COMPANY,PHONE:user.PHONE,ADDRESS:user.ADDRESS,STATE:user.STATE,STATE_CODE:stateCode,PIN:user.PIN,GSTIN:user.GSTIN,PLAN:plan.NAME,START_DATE:start,EXPIRY_DATE:expiry,TAXABLE:taxable,CGST:cgst,SGST:sgst,IGST:igst,TOTAL:total,AMOUNT_WORDS:amountWords_(total),PDF_FILE_ID:file.getId(),PDF_URL:file.getUrl(),CREATED_AT:now_()});
  appendObject_('INVOICE_ITEMS',{INVOICE_NUMBER:invoiceNumber,SERIAL_NO:1,DESCRIPTION:'Queshift '+plan.NAME+' Software Subscription',SAC_CODE:getSetting_('SAC_CODE'),QTY:1,RATE:taxable,TAXABLE:taxable,GST_RATE:rate,TOTAL:total});return{invoiceNumber:invoiceNumber,fileId:file.getId(),url:file.getUrl()};
}
function invoiceHtml_(d){var logo=imageData_(getSetting_('LOGO_FILE_ID')),qr=imageData_(getSetting_('QR_FILE_ID')),sig=imageData_(getSetting_('SIGNATURE_FILE_ID'));return'<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;color:#172337;margin:36px}.box{border:1px solid #24384f}.head{padding:25px;display:flex;justify-content:space-between;background:#f3f7f8;border-bottom:4px solid #1757a6}.head img{max-width:120px;max-height:80px}.right{text-align:right}.bill{padding:25px;display:flex;justify-content:space-between}.blue{color:#1757a6}.orange{color:#f07819}table{width:100%;border-collapse:collapse}th{padding:13px;background:#1757a6;color:#fff;text-align:left}td{padding:12px;border-bottom:1px solid #e3e8ee}.totals{width:43%;margin-left:auto}.totals td:last-child{text-align:right}.foot{padding:25px}.pay{display:flex;justify-content:space-between}.qr{width:105px}.sig{max-width:130px;max-height:70px}.thanks{text-align:center;padding:15px;background:#1757a6;color:#fff;font-weight:bold}</style></head><body><div class="box"><div class="head"><div>'+(logo?'<img src="'+logo+'">':'<h2>AW TAXATION</h2>')+'</div><div class="right"><h2>'+html_(getSetting_('SELLER_NAME'))+'</h2><div>'+html_(getSetting_('SELLER_ADDRESS'))+'</div><div>GSTIN: '+html_(getSetting_('SELLER_GSTIN')||'To be updated')+'</div><div>Ph: '+html_(getSetting_('PHONE1'))+', '+html_(getSetting_('PHONE2'))+'</div><div>'+html_(getSetting_('EMAIL'))+'</div><div>MSME: '+html_(getSetting_('MSME'))+'</div></div></div><div class="bill"><div><b class="blue">INVOICE TO:</b><h3>'+html_(d.user.COMPANY||d.user.NAME)+'</h3><div>'+html_(d.user.NAME)+'</div><div>'+html_(d.user.ADDRESS)+', '+html_(d.user.STATE)+' - '+html_(d.user.PIN)+'</div><div>State Code: '+d.stateCode+'</div><div>GSTIN: '+html_(d.user.GSTIN||'Unregistered')+'</div></div><div class="right"><h1 class="orange">TAX INVOICE</h1><div><b>Invoice No:</b> '+d.invoiceNumber+'</div><div><b>Date:</b> '+formatDate_(d.date)+'</div><div><b>Order ID:</b> '+d.payment.ORDER_ID+'</div><div><b>Billing:</b> '+html_(d.plan.NAME)+'</div></div></div><table><tr><th>No.</th><th>Service Description</th><th>SAC</th><th>Rate</th><th>Qty</th><th>Amount</th></tr><tr><td>01</td><td>Queshift '+html_(d.plan.NAME)+' Software Subscription<br><small>'+formatDate_(d.start)+' to '+formatDate_(d.expiry)+'</small></td><td>'+html_(getSetting_('SAC_CODE'))+'</td><td>₹'+money_(d.taxable)+'</td><td>1</td><td>₹'+money_(d.taxable)+'</td></tr></table><table class="totals"><tr><td>Taxable Value</td><td>₹'+money_(d.taxable)+'</td></tr>'+(d.cgst?'<tr><td>CGST '+d.rate/2+'%</td><td>₹'+money_(d.cgst)+'</td></tr><tr><td>SGST '+d.rate/2+'%</td><td>₹'+money_(d.sgst)+'</td></tr>':'<tr><td>IGST '+d.rate+'%</td><td>₹'+money_(d.igst)+'</td></tr>')+'<tr><th>Grand Total</th><th>₹'+money_(d.total)+'</th></tr></table><div class="foot"><p><i>Rupees '+amountWords_(d.total)+' Only</i></p><div class="pay"><div><h3 class="orange">PAYMENT INFORMATION</h3><div>'+html_(getSetting_('BANK_NAME'))+', A/C '+html_(getSetting_('BANK_ACCOUNT'))+'</div><div>IFSC: '+html_(getSetting_('IFSC'))+'</div>'+(qr?'<img class="qr" src="'+qr+'">':'')+'</div><div class="right">'+(sig?'<img class="sig" src="'+sig+'">':'<div style="height:60px"></div>')+'<br><b>Authorised Signatory</b><br>AW TAXATION</div></div><h3 class="blue">TERMS & CONDITIONS</h3><ul><li>Subscription access is governed by the approved plan and expiry date.</li><li>Work processed based on client data provided.</li><li>E.&O.E. (Errors and Omissions Excepted).</li></ul></div><div class="thanks">THANK YOU FOR YOUR BUSINESS</div></div></body></html>';}

function submitComment_(id,p){var u=findOne_('USERS','EMAIL',id.email)||{};appendObject_('COMMENTS',{ID:uuid_(),BLOG_SLUG:clean_(p.slug),USER_EMAIL:id.email,NAME:u.NAME||id.name||id.email,COMMENT:clean_(p.comment),STATUS:'PENDING',REPLY:'',CREATED_AT:now_(),UPDATED_AT:now_()});return{submitted:true};}
function submitReview_(id,p){var u=findOne_('USERS','EMAIL',id.email)||{},rating=Math.max(1,Math.min(5,+p.rating||0));appendObject_('REVIEWS',{ID:uuid_(),USER_EMAIL:id.email,NAME:u.NAME||id.name||id.email,RATING:rating,COMMENT:clean_(p.comment),STATUS:'PENDING',REPLY:'',CREATED_AT:now_(),UPDATED_AT:now_()});return{submitted:true};}
function reviewAction_(p){var targets=['REVIEWS','COMMENTS'],found;targets.some(function(s){var r=findRow_(s,'ID',p.id);if(r){found={sheet:s,row:r.row};return true;}});if(!found)throw new Error('Review/comment not found.');var sh=sheet_(found.sheet),headers=QS_HEADERS[found.sheet],statusCol=headers.indexOf('STATUS')+1,replyCol=headers.indexOf('REPLY')+1;if(p.task==='APPROVE')sh.getRange(found.row,statusCol).setValue('APPROVED');else if(p.task==='REPLY'){sh.getRange(found.row,replyCol).setValue(clean_(p.reply));sh.getRange(found.row,statusCol).setValue('APPROVED');}return{saved:true};}
function contact_(p){MailApp.sendEmail({to:getSetting_('EMAIL')||QS_ADMIN_EMAIL,subject:'Queshift website enquiry - '+clean_(p.name||'Visitor'),htmlBody:'<h2>Website enquiry</h2><p><b>Name:</b> '+html_(p.name)+'</p><p><b>Phone:</b> '+html_(p.phone)+'</p><p><b>Company:</b> '+html_(p.company)+'</p><p>'+html_(p.message)+'</p>'});return{sent:true};}

function expireSubscriptions(){rowsWithNumbers_('SUBSCRIPTIONS').forEach(function(x){if(x.obj.STATUS==='ACTIVE'&&new Date(x.obj.EXPIRY_DATE)<new Date()){sheet_('SUBSCRIPTIONS').getRange(x.row,6).setValue('EXPIRED');var fileId=getSetting_('SOFTWARE_FILE_ID');if(fileId)try{DriveApp.getFileById(fileId).removeViewer(x.obj.USER_EMAIL);}catch(e){}}});}

function ss_(){var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');return id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();}
function sheet_(name){var sh=ss_().getSheetByName(name);if(!sh)throw new Error('Run initQueshiftSystem first. Missing sheet: '+name);return sh;}
function ensureSheet_(ss,name,headers){var sh=ss.getSheetByName(name)||ss.insertSheet(name);if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#075bb8').setFontColor('#ffffff');sh.setFrozenRows(1);}return sh;}
function rows_(name){var sh=sheet_(name),lr=sh.getLastRow(),headers=QS_HEADERS[name];if(lr<2)return[];return sh.getRange(2,1,lr-1,headers.length).getValues().map(function(row){var o={};headers.forEach(function(h,i){o[h]=row[i];});return o;});}
function rowsWithNumbers_(name){return rows_(name).map(function(o,i){return{obj:o,row:i+2};});}
function appendObject_(name,obj){var headers=QS_HEADERS[name];sheet_(name).appendRow(headers.map(function(h){return obj[h]===undefined?'':obj[h];}));}
function findRow_(name,key,value){return rowsWithNumbers_(name).filter(function(x){return String(x.obj[key]).toLowerCase()===String(value).toLowerCase();})[0]||null;}
function findOne_(name,key,value){var x=findRow_(name,key,value);return x?x.obj:null;}
function latest_(name,key,value){var a=rows_(name).filter(function(r){return String(r[key]).toLowerCase()===String(value).toLowerCase();});return a.length?a[a.length-1]:null;}
function upsertObject_(name,key,value,obj){var found=findRow_(name,key,value),headers=QS_HEADERS[name];if(!found){appendObject_(name,obj);return;}var old=found.obj;headers.forEach(function(h,i){sheet_(name).getRange(found.row,i+1).setValue(obj[h]===undefined?old[h]:obj[h]);});}
function deleteBy_(name,key,value){var f=findRow_(name,key,value);if(f)sheet_(name).deleteRow(f.row);}
function active_(r){return r.ACTIVE===''||bool_(r.ACTIVE);}
function sort_(a,b){return(+a.SORT_ORDER||999)-(+b.SORT_ORDER||999);}
function getSetting_(key){var r=findOne_('SETTINGS','KEY',key);return r?r.VALUE:'';}
function setSetting_(key,value){upsertObject_('SETTINGS','KEY',key,{KEY:key,VALUE:value,UPDATED_AT:now_()});}
function seedSetting_(key,value){if(!findOne_('SETTINGS','KEY',key))appendObject_('SETTINGS',{KEY:key,VALUE:value,UPDATED_AT:now_()});}
function settingsObject_(){var o={};rows_('SETTINGS').forEach(function(r){o[r.KEY]=r.VALUE;});return o;}
function getOrCreateFolder_(parent,name){var it=parent.getFoldersByName(name);return it.hasNext()?it.next():parent.createFolder(name);}
function getSubfolder_(name){return getOrCreateFolder_(DriveApp.getFolderById(getSetting_('ROOT_FOLDER_ID')),name);}
function extractDriveId_(value){var s=String(value||''),m=s.match(/[?&]id=([A-Za-z0-9_-]{10,})/)||s.match(/\/d\/([A-Za-z0-9_-]{10,})/);if(m)return m[1];if(/^[A-Za-z0-9_-]{20,}$/.test(s))return s;return'';}
function publicFileUrl_(file){if(!file)return'';var key='';try{if(file.getSecurityUpdateEnabled())key=file.getResourceKey()||'';}catch(e){}return'https://drive.google.com/thumbnail?id='+encodeURIComponent(file.getId())+'&sz=w2000'+(key?'&resourcekey='+encodeURIComponent(key):'');}
function publicMediaUrl_(value){if(!value)return'';var id=extractDriveId_(value);if(!id)return String(value);try{return publicFileUrl_(DriveApp.getFileById(id));}catch(e){return String(value);}}
function saveDataUrl_(dataUrl,name,folder,isPublic){var m=String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);if(!m)throw new Error('Invalid uploaded file.');var ext=(m[1].split('/')[1]||'bin').replace('jpeg','jpg'),blob=Utilities.newBlob(Utilities.base64Decode(m[2]),m[1],name+'.'+ext),file=folder.createFile(blob);if(isPublic)try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}var publicUrl=isPublic?publicFileUrl_(file):file.getUrl();return{id:file.getId(),url:file.getUrl(),publicUrl:publicUrl};}
function imageData_(id){if(!id)return'';try{var b=DriveApp.getFileById(id).getBlob();return'data:'+b.getContentType()+';base64,'+Utilities.base64Encode(b.getBytes());}catch(e){return'';}}
function youtubeMeta_(id){var key=PropertiesService.getScriptProperties().getProperty('YOUTUBE_API_KEY');if(!key)return{title:'',description:'',thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'};try{var url='https://www.googleapis.com/youtube/v3/videos?part=snippet&id='+encodeURIComponent(id)+'&key='+encodeURIComponent(key),j=JSON.parse(UrlFetchApp.fetch(url).getContentText()),s=j.items[0].snippet;return{title:s.title,description:s.description,thumbnail:s.thumbnails.high.url};}catch(e){return{title:'',description:'',thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'};}}
function parseVideoId_(url){var s=String(url||''),m=s.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);return m?m[1]:'';}
function output_(obj,callback){var text=JSON.stringify(obj);if(callback&&/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback))return ContentService.createTextOutput(callback+'('+text+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);}
function parseJson_(text,fallback){try{return JSON.parse(text||fallback);}catch(e){return JSON.parse(fallback);}}
function uuid_(){return Utilities.getUuid();}function now_(){return new Date();}function clean_(v){return String(v||'').trim();}function digits_(v){return String(v||'').replace(/\D/g,'');}function bool_(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1';}function round_(n){return Math.round((+n+Number.EPSILON)*100)/100;}function money_(n){return Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}function html_(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}function formatDate_(v){return v?Utilities.formatDate(new Date(v),Session.getScriptTimeZone(),'dd-MMM-yyyy'):'';}function audit_(email,action,details){appendObject_('AUDIT_LOG',{ID:uuid_(),EMAIL:email,ACTION:action,DETAILS:details,CREATED_AT:now_()});}
function sanitizeHtml_(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*(["']).*?\1/gi,'').replace(/javascript:/gi,'');}
function slugify_(s){return String(s||'blog').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'blog-'+Date.now();}
function nextInvoiceNumber_(){var d=new Date(),y=d.getMonth()>=3?d.getFullYear():d.getFullYear()-1,fy=y+'-'+String(y+1).slice(-2),count=rows_('INVOICES').filter(function(r){return String(r.INVOICE_NUMBER).indexOf('QS/'+fy+'/')===0;}).length+1;return'QS/'+fy+'/'+String(count).padStart(4,'0');}
function stateCode_(state){var m={"Jammu and Kashmir":"01","Himachal Pradesh":"02","Punjab":"03","Chandigarh":"04","Uttarakhand":"05","Haryana":"06","Delhi":"07","Rajasthan":"08","Uttar Pradesh":"09","Bihar":"10","Sikkim":"11","Arunachal Pradesh":"12","Nagaland":"13","Manipur":"14","Mizoram":"15","Tripura":"16","Meghalaya":"17","Assam":"18","West Bengal":"19","Jharkhand":"20","Odisha":"21","Chhattisgarh":"22","Madhya Pradesh":"23","Gujarat":"24","Dadra and Nagar Haveli and Daman and Diu":"26","Maharashtra":"27","Karnataka":"29","Goa":"30","Lakshadweep":"31","Kerala":"32","Tamil Nadu":"33","Puducherry":"34","Andaman and Nicobar Islands":"35","Telangana":"36","Andhra Pradesh":"37","Ladakh":"38"};return m[state]||'';}
function amountWords_(num){var ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];function two(n){return n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');}function three(n){return(n>=100?ones[Math.floor(n/100)]+' Hundred ':'')+two(n%100);}var n=Math.round(+num);if(!n)return'Zero';var out=[];if(n>=10000000){out.push(three(Math.floor(n/10000000))+' Crore');n%=10000000;}if(n>=100000){out.push(three(Math.floor(n/100000))+' Lakh');n%=100000;}if(n>=1000){out.push(three(Math.floor(n/1000))+' Thousand');n%=1000;}if(n)out.push(three(n));return out.join(' ').replace(/\s+/g,' ').trim();}
