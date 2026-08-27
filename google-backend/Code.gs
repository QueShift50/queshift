/** Queshift Google Apps Script backend - SAFE MERGED BUILD. Existing website features preserved; Trial/Enquiries/Activation added; Blogs made backward-compatible. */
var QS_ADMIN_EMAIL = 'info.queshift@gmail.com';
var QS_HEADERS = {
  SETTINGS:['KEY','VALUE','UPDATED_AT'],
  USERS:['GOOGLE_ID','EMAIL','NAME','COMPANY','PHONE','ADDRESS','STATE','PIN','GSTIN','CREATED_AT','UPDATED_AT'],
  PARTNERS:['ID','NAME','ROLE','BIO','IMAGE_URL','SORT_ORDER','ACTIVE','UPDATED_AT'],
  BANNERS:['ID','TITLE','IMAGE_URL','LINK','SORT_ORDER','ACTIVE','UPDATED_AT'],
  BRANDS:['ID','NAME','IMAGE_URL','URL','SORT_ORDER','ACTIVE','UPDATED_AT'],
  VIDEOS:['ID','URL','VIDEO_ID','TITLE','DESCRIPTION','THUMBNAIL','FEATURED','ACTIVE','UPDATED_AT'],
  BLOGS:['ID','SLUG','TITLE','SUMMARY','HTML','IMAGE_URL','META_TITLE','META_DESCRIPTION','KEYWORDS','TAGS','STATUS','PUBLISHED_AT','UPDATED_AT'],
  HELP_ARTICLES:['ID','SLUG','CATEGORY','TITLE','SUMMARY','HTML','META_TITLE','META_DESCRIPTION','KEYWORDS','LANGUAGE','STATUS','PUBLISHED_AT','UPDATED_AT'],
  COMMENTS:['ID','BLOG_SLUG','USER_EMAIL','NAME','COMMENT','STATUS','REPLY','CREATED_AT','UPDATED_AT'],
  REVIEWS:['ID','USER_EMAIL','NAME','RATING','COMMENT','STATUS','REPLY','CREATED_AT','UPDATED_AT'],
  PLANS:['CODE','NAME','BASE_PRICE','GST_RATE','DAYS','ACTIVE'],
  PAYMENTS:['ORDER_ID','USER_EMAIL','NAME','PHONE','STATE','PLAN','BASE_AMOUNT','GST_AMOUNT','TOTAL_AMOUNT','UTR','PAYMENT_DATE','SCREENSHOT_FILE_ID','SCREENSHOT_URL','STATUS','NOTES','CREATED_AT','UPDATED_AT'],
  SUBSCRIPTIONS:['ID','USER_EMAIL','PLAN','START_DATE','EXPIRY_DATE','STATUS','ORDER_ID','DOWNLOAD_URL','UPDATED_AT'],
  INVOICES:['INVOICE_ID','INVOICE_NUMBER','ORDER_ID','DATE','USER_EMAIL','CUSTOMER_NAME','COMPANY','PHONE','ADDRESS','STATE','STATE_CODE','PIN','GSTIN','PLAN','START_DATE','EXPIRY_DATE','TAXABLE','CGST','SGST','IGST','TOTAL','AMOUNT_WORDS','PDF_FILE_ID','PDF_URL','CREATED_AT'],
  INVOICE_ITEMS:['INVOICE_NUMBER','SERIAL_NO','DESCRIPTION','SAC_CODE','QTY','RATE','TAXABLE','GST_RATE','TOTAL'],
  AUDIT_LOG:['ID','EMAIL','ACTION','DETAILS','CREATED_AT'],
  ENQUIRIES:['ID','NAME','EMAIL','PHONE','COMPANY','MESSAGE','STATUS','REPLY','CREATED_AT','UPDATED_AT'],
  TRIAL_LEADS:['ID','NAME','EMAIL','PHONE','COMPANY','STATE','OTP_HASH','OTP_EXPIRES_AT','OTP_SENT_AT','OTP_ATTEMPTS','VERIFIED','VERIFIED_AT','DOWNLOAD_COUNT','LAST_DOWNLOAD_AT','CREATED_AT','UPDATED_AT','AVAILABILITY_STATUS','COMING_SOON_SHOWN_AT','READY_AT','DOWNLOAD_GRANTED_AT'],
ACTIVATIONS:[
  'ID',
  'ORDER_ID',
  'USER_EMAIL',
  'CLIENT_NAME',
  'COMPANY',
  'PLAN',
  'MACHINE_CODE',
  'LICENSE_ID',
  'ACTIVATION_DATE',
  'EXPIRY_DATE',
  'DAYS',
  'STATUS',
  'ISSUED_AT',
  'UPDATED_AT'
]
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
  seedSetting_('FIRST_BOOKING_DISCOUNT','20'); seedSetting_('FIRST_BOOKING_COUPON','FIRST20');
  seedSetting_('SOFTWARE_VERSION','');
  seedSetting_('TRIAL_DAYS','15');
  seedSetting_('TRIAL_DOWNLOAD_URL','');
  seedSetting_('TRIAL_SOFTWARE_FILE_ID','');
  seedSetting_('TRIAL_REQUIREMENTS','64-bit Windows 10 or Windows 11');
  seedSetting_('TRIAL_INSTRUCTIONS','Queshift trial works only on 64-bit Windows 10/11. Download the setup only after OTP verification.');
  getOrCreateTrialOtpSecret_();
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
    else if (action === 'blogHealth') data = {totalRows:rows_('BLOGS').length,published:publicBlogs_().length,titles:publicBlogs_().slice(0,20).map(function(b){return b.title;})};
    else if (action === 'helpArticles') data = publicHelpArticles_();
    else if (action === 'helpArticle') data = publicHelpArticle_(e.parameter.slug || '');
    else if (action === 'helpHealth') data = {totalRows:rows_('HELP_ARTICLES').length,published:publicHelpArticles_().length,titles:publicHelpArticles_().slice(0,20).map(function(h){return h.title;})};
    else if (action === 'trialConfig') data = trialPublicConfig_();
    else if (action === 'health') data = {status:'ok',time:new Date().toISOString()};
    else if (action === 'activationPing')
  data = {
    activationApi: 'v0.4',
    ready: true,
    time: new Date().toISOString()
  };
    else throw new Error('Unknown public action.');
    return output_({ok:true,data:data},e && e.parameter.callback);
  } catch (err) { return output_({ok:false,message:err.message},e && e.parameter.callback); }
}

function doPost(e) {
  try {
    var action = e.parameter.action || '', payload = parseJson_(e.parameter.payload,'{}'), credential = e.parameter.credential || '', data;
    if (action === 'contact') data = contact_(payload);
else if (action === 'trialRequestOtp') data = trialRequestOtp_(payload);
else if (action === 'trialVerifyOtp') data = trialVerifyOtp_(payload);
else if (action === 'aiHelp') data = aiHelp_(payload);
else if (action === 'login') data = login_(credential,false);
else if (action === 'adminLogin') data = login_(credential,true);
else if (action === 'logout') data = logoutSession_(credential);

// Queshift Desktop Activation Tool
    else if (action === 'activationVerifyOrder')
    data = activationVerifyOrder_(payload, credential);

    else if (action === 'activationCommit')
           data = activationCommit_(payload, credential);

     else {
  var identity = verifyCredential_(credential);
      if (action === 'saveProfile') data = saveProfile_(identity,payload);
      else if (action === 'userDashboard') data = userDashboard_(identity);
      else if (action === 'pricingStatus') data = pricingStatus_(identity);
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
        else if (action === 'saveHelpArticle') data = saveHelpArticle_(payload);
        else if (action === 'savePlan') data = savePlan_(payload);
        else if (action === 'saveSoftwareFile') data = saveSoftwareFile_(payload);
        else if (action === 'deleteContent') data = deleteContent_(payload);
        else if (action === 'approvePayment') data = approvePayment_(identity,payload);
        else if (action === 'rejectPayment') data = updatePaymentStatus_(payload.orderId,'REJECTED');
        else if (action === 'reviewAction') data = reviewAction_(payload);
        else if (action === 'enquiryAction') data = enquiryAction_(payload);
        else throw new Error('Unknown action.');
      }
    }
    return output_({ok:true,data:data});
  } catch (err) { return output_({ok:false,message:err.message}); }
}

function publicData_() {
  return {
    heroTitle:getSetting_('HERO_TITLE'), heroText:getSetting_('HERO_TEXT'), phone1:getSetting_('PHONE1'), phone2:getSetting_('PHONE2'), email:getSetting_('EMAIL'),
    logoUrl:publicMediaUrl_(getSetting_('LOGO_URL') || getSetting_('LOGO_FILE_ID')),
    faviconUrl:publicMediaUrl_(getSetting_('FAVICON_URL') || getSetting_('FAVICON_FILE_ID')),
    qrUrl:publicMediaUrl_(getSetting_('QR_URL') || getSetting_('QR_FILE_ID')),
    gstRate:+getSetting_('GST_RATE')||18,
    social:parseJson_(getSetting_('SOCIAL_JSON'),'{}'),
    offer:{percent:firstDiscountPercent_(),coupon:getSetting_('FIRST_BOOKING_COUPON')||'FIRST20'},
    trial:trialPublicConfig_(),
    plans:rows_('PLANS').filter(active_).map(function(r){return{code:r.CODE,name:r.NAME,price:+r.BASE_PRICE,gstRate:+r.GST_RATE||(+getSetting_('GST_RATE')||18),days:+r.DAYS,active:bool_(r.ACTIVE)};}),
    banners:rows_('BANNERS').filter(active_).sort(sort_).map(function(r){return{id:r.ID,title:r.TITLE,imageUrl:publicMediaUrl_(r.IMAGE_URL),link:r.LINK,active:bool_(r.ACTIVE)};}),
    partners:rows_('PARTNERS').filter(active_).sort(function(a,b){var an=String(a.NAME||'').toLowerCase(),bn=String(b.NAME||'').toLowerCase();var ar=an==='ajay kumar'?1:an==='wasim raza'?2:(+a.SORT_ORDER||99);var br=bn==='ajay kumar'?1:bn==='wasim raza'?2:(+b.SORT_ORDER||99);return ar-br;}).map(function(r){return{id:r.ID,name:r.NAME,role:r.ROLE,bio:r.BIO,imageUrl:publicMediaUrl_(r.IMAGE_URL)};}),
    brands:rows_('BRANDS').filter(active_).sort(sort_).map(function(r){return{id:r.ID,name:r.NAME,imageUrl:publicMediaUrl_(r.IMAGE_URL),url:r.URL};}),
    videos:rows_('VIDEOS').filter(active_).map(function(r){return{id:r.ID,url:r.URL,videoId:r.VIDEO_ID,title:r.TITLE,description:r.DESCRIPTION,thumbnail:r.THUMBNAIL,featured:bool_(r.FEATURED),active:bool_(r.ACTIVE)};})
  };
}

function blogIsPublished_(r){
  var status=String(r.STATUS||'').trim().toUpperCase();
  if(status==='DRAFT'||status==='DELETED'||status==='HIDDEN'||status==='INACTIVE')return false;
  if(status==='PUBLISHED'||status==='PUBLISH'||status==='LIVE'||status==='ACTIVE'||status==='TRUE'||status==='YES'||status==='1')return true;
  // Older Queshift blog rows sometimes have a blank status; if real blog content exists, keep them public.
  return !status && !!clean_(r.TITLE) && (!!clean_(r.HTML)||!!clean_(r.SUMMARY));
}
function safeIsoDate_(primary,fallback){
  var values=[primary,fallback,new Date()];
  for(var i=0;i<values.length;i++){
    try{var d=new Date(values[i]);if(!isNaN(d.getTime()))return d.toISOString();}catch(_){}
  }
  return new Date().toISOString();
}
function publicBlogs_() {
  return rows_('BLOGS')
    .filter(blogIsPublished_)
    .sort(function(a,b){
      var ad=new Date(a.PUBLISHED_AT||a.UPDATED_AT||0).getTime()||0;
      var bd=new Date(b.PUBLISHED_AT||b.UPDATED_AT||0).getTime()||0;
      return bd-ad;
    })
    .map(function(r){return blogPublic_(r,false);});
}
function publicBlog_(slug) {
  var key=String(slug||'').trim();
  var row=rows_('BLOGS').filter(function(r){return String(r.SLUG||'').trim()===key && blogIsPublished_(r);})[0];
  if(!row) throw new Error('Blog not found.');
  var b=blogPublic_(row,true);
  b.comments=rows_('COMMENTS').filter(function(c){return String(c.BLOG_SLUG||'')===key&&String(c.STATUS||'').toUpperCase()==='APPROVED';}).map(function(c){return{name:c.NAME,comment:c.COMMENT,reply:c.REPLY};});
  return b;
}
function blogPublic_(r,full){
  var slug=clean_(r.SLUG)||slugify_(r.TITLE||r.ID||('blog-'+Date.now()));
  var dateValue=r.PUBLISHED_AT||r.UPDATED_AT||'';
  var o={
    id:r.ID,slug:slug,title:r.TITLE,summary:r.SUMMARY,
    imageUrl:publicMediaUrl_(r.IMAGE_URL),metaTitle:r.META_TITLE||r.TITLE,
    metaDescription:r.META_DESCRIPTION||r.SUMMARY,keywords:r.KEYWORDS,tags:r.TAGS,
    date:formatDate_(dateValue),isoDate:safeIsoDate_(r.PUBLISHED_AT,r.UPDATED_AT)
  };
  if(full)o.html=r.HTML;
  return o;
}


function helpIsPublished_(r){
  var status=String(r.STATUS||'').trim().toUpperCase();
  if(status==='DRAFT'||status==='DELETED'||status==='HIDDEN'||status==='INACTIVE')return false;
  if(status==='PUBLISHED'||status==='PUBLISH'||status==='LIVE'||status==='ACTIVE'||status==='TRUE'||status==='YES'||status==='1')return true;
  return !status && !!clean_(r.TITLE) && (!!clean_(r.HTML)||!!clean_(r.SUMMARY));
}
function helpPublic_(r,full){
  var slug=clean_(r.SLUG)||slugify_(r.TITLE||r.ID||('help-'+Date.now()));
  var o={id:r.ID,slug:slug,category:r.CATEGORY||'General',title:r.TITLE,summary:r.SUMMARY,
    metaTitle:r.META_TITLE||r.TITLE,metaDescription:r.META_DESCRIPTION||r.SUMMARY,
    keywords:r.KEYWORDS||'',language:r.LANGUAGE||'',date:formatDate_(r.PUBLISHED_AT||r.UPDATED_AT||''),
    isoDate:safeIsoDate_(r.PUBLISHED_AT,r.UPDATED_AT)};
  if(full)o.html=r.HTML;
  return o;
}
function publicHelpArticles_(){
  return rows_('HELP_ARTICLES').filter(helpIsPublished_).sort(function(a,b){
    var ad=new Date(a.PUBLISHED_AT||a.UPDATED_AT||0).getTime()||0;
    var bd=new Date(b.PUBLISHED_AT||b.UPDATED_AT||0).getTime()||0;
    return bd-ad;
  }).map(function(r){return helpPublic_(r,false);});
}
function publicHelpArticle_(slug){
  var key=String(slug||'').trim();
  var row=rows_('HELP_ARTICLES').filter(function(r){return String(r.SLUG||'').trim()===key && helpIsPublished_(r);})[0];
  if(!row)throw new Error('Help guide not found.');
  return helpPublic_(row,true);
}
function saveHelpArticle_(p){
  var slug=slugify_(p.slug||p.title),existing=findOne_('HELP_ARTICLES','SLUG',slug);
  var title=clean_(p.title);if(!title)throw new Error('Help title is required.');
  upsertObject_('HELP_ARTICLES','SLUG',slug,{
    ID:existing?existing.ID:uuid_(),SLUG:slug,CATEGORY:clean_(p.category)||'General',TITLE:title,
    SUMMARY:clean_(p.summary),HTML:sanitizeHtml_(p.html),META_TITLE:clean_(p.metaTitle)||title,
    META_DESCRIPTION:clean_(p.metaDescription)||clean_(p.summary),KEYWORDS:clean_(p.keywords),
    LANGUAGE:clean_(p.language)||'English / Hinglish',STATUS:p.status==='DRAFT'?'DRAFT':'PUBLISHED',
    PUBLISHED_AT:existing?existing.PUBLISHED_AT:now_(),UPDATED_AT:now_()
  });
  return{saved:true,slug:slug};
}
function stripHtmlForSearch_(value){
  return String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
}
function searchTokens_(q){
  var stop={the:1,is:1,are:1,a:1,an:1,and:1,or:1,to:1,for:1,of:1,in:1,on:1,ka:1,ki:1,ke:1,kya:1,hai:1,kaise:1,kare:1,karna:1,mein:1,me:1,se:1,ko:1};
  var seen={};return String(q||'').toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g,' ').split(/\s+/).filter(function(t){if(t.length<3||stop[t]||seen[t])return false;seen[t]=1;return true;}).slice(0,12);
}
function helpAnswerFromText_(text,tokens){
  var clean=stripHtmlForSearch_(text);
  if(!clean)return'';
  var sentences=clean.split(/[.!?]\s+|\s*[•|]\s*/).filter(function(s){return s.length>25;});
  var ranked=sentences.map(function(s){var l=s.toLowerCase(),score=0;tokens.forEach(function(t){if(l.indexOf(t)>=0)score+=2;});return{s:s,score:score};})
    .filter(function(x){return x.score>0;}).sort(function(a,b){return b.score-a.score;});
  if(!ranked.length)return clean.slice(0,520)+(clean.length>520?'…':'');
  return ranked.slice(0,3).map(function(x){return x.s;}).join(' ').slice(0,900);
}
function aiHelp_(p){
  var question=clean_(p&&p.question);if(!question)throw new Error('Please type your question.');
  var q=question.toLowerCase(),tokens=searchTokens_(question),best=null,bestScore=0;
  rows_('HELP_ARTICLES').filter(helpIsPublished_).forEach(function(r){
    var title=String(r.TITLE||'').toLowerCase(),cat=String(r.CATEGORY||'').toLowerCase(),keys=String(r.KEYWORDS||'').toLowerCase();
    var searchable=[r.TITLE,r.CATEGORY,r.SUMMARY,r.KEYWORDS,stripHtmlForSearch_(r.HTML)].join(' ').toLowerCase(),score=0;
    tokens.forEach(function(t){if(title.indexOf(t)>=0)score+=7;if(cat.indexOf(t)>=0)score+=5;if(keys.indexOf(t)>=0)score+=5;if(searchable.indexOf(t)>=0)score+=1;});
    if(score>bestScore){bestScore=score;best=r;}
  });
  if(best&&bestScore>=2){
    var answer=helpAnswerFromText_([best.SUMMARY,best.HTML].join(' '),tokens)||best.SUMMARY||'Open the related Queshift Help guide for complete steps.';
    return{answer:answer,matchedSlug:best.SLUG,title:best.TITLE,needsQuery:false,source:'HELP_ARTICLES'};
  }
  if(/myntra|settlement|hsn|tally|busy|rto|return|state mapping|gst|invoice|reconciliation/.test(q)){
    var answer='Queshift Myntra Help covers import, validation, State mapping, HSN/GST, Real Invoice/State/Order-wise reports, Tally/BUSY export, settlement reconciliation, P&L and GST. Open the Myntra guide for the exact step related to your issue.';
    if(/state|mapping/.test(q))answer='STATE MAPPING REQUIRED means the marketplace State is not yet linked to your Tally/BUSY State. Open Validation, select the correct searchable State, save mapping and run Validation again.';
    else if(/hsn|item name|gst rate/.test(q))answer='Check Order ID, Packet ID and SKU. In Validation, review the suggested HSN/GST/Item mapping, correct it if required, save the mapping, and validate again before generating the report.';
    else if(/settle|pending|unsettled|suspense/.test(q))answer='100% SETTLED means expected and received payout match within tolerance. PENDING/UNSETTLED is unpaid, partial or short-paid amount. SUSPENSE means settlement exists but a reliable imported SALE/order match was not found.';
    else if(/tally|busy|journal/.test(q))answer='Generate the Queshift report first, then use Generate Tally or Generate BUSY. If Journal Mapping is required, complete the Tally/BUSY ledger settings in Client Settings and regenerate.';
    return{answer:answer,matchedSlug:'myntra',title:'Myntra – Complete Client Help',needsQuery:false,source:'BUILT_IN_MYNTRA_HELP'};
  }
  return{answer:'I could not find a confident answer in the published Queshift Help content. Please send your query with your email and phone number; the Queshift team will contact you shortly.',matchedSlug:'',needsQuery:true,source:'NO_MATCH'};
}

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

function firstDiscountPercent_(){var raw=getSetting_('FIRST_BOOKING_DISCOUNT'),n=raw===''||raw===null||raw===undefined?20:+raw;if(!isFinite(n))n=20;return Math.max(0,Math.min(100,n));}
function firstBookingEligible_(email){return !rows_('PAYMENTS').some(function(p){var st=String(p.STATUS).toUpperCase();return String(p.USER_EMAIL).toLowerCase()===String(email).toLowerCase()&&(st==='PENDING'||st==='APPROVED');})&&!rows_('SUBSCRIPTIONS').some(function(s){return String(s.USER_EMAIL).toLowerCase()===String(email).toLowerCase();});}
function pricingStatus_(id){return{eligible:firstBookingEligible_(id.email),percent:firstDiscountPercent_(),coupon:getSetting_('FIRST_BOOKING_COUPON')||'FIRST20'};}

function paymentAttempt_(id,p) {
  var user=findOne_('USERS','EMAIL',id.email); if(!user||!user.PHONE||!user.STATE)throw new Error('Complete your customer profile before payment.');
  var plan=findOne_('PLANS','CODE',p.plan); if(!plan||!bool_(plan.ACTIVE))throw new Error('Invalid subscription plan.'); if(!p.screenshot)throw new Error('Payment screenshot is required.');
  if(p.gstin){upsertObject_('USERS','EMAIL',id.email,{GSTIN:String(p.gstin).toUpperCase().trim(),UPDATED_AT:now_()});user=findOne_('USERS','EMAIL',id.email);}
  var eligible=firstBookingEligible_(id.email),discountPercent=eligible?firstDiscountPercent_():0,originalBase=+plan.BASE_PRICE||0,base=round_(originalBase*(1-discountPercent/100));
  var gstRate=+getSetting_('GST_RATE')||+plan.GST_RATE||18,gst=round_(base*(gstRate/100)),total=round_(base+gst),orderId='QS'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss');
  var file=saveDataUrl_(p.screenshot,'Payment-'+orderId,getSubfolder_('Payment Screenshots'),false);
  appendObject_('PAYMENTS',{ORDER_ID:orderId,USER_EMAIL:id.email,NAME:user.NAME,PHONE:user.PHONE,STATE:user.STATE,PLAN:plan.CODE,BASE_AMOUNT:base,GST_AMOUNT:gst,TOTAL_AMOUNT:total,UTR:clean_(p.utr),PAYMENT_DATE:p.paymentDate,SCREENSHOT_FILE_ID:file.id,SCREENSHOT_URL:file.url,STATUS:'PENDING',NOTES:clean_(p.notes)+(discountPercent?' | FIRST BOOKING '+discountPercent+'% OFF ('+(getSetting_('FIRST_BOOKING_COUPON')||'FIRST20')+')':''),CREATED_AT:now_(),UPDATED_AT:now_()});
  MailApp.sendEmail({to:getSetting_('ADMIN_EMAIL')||QS_ADMIN_EMAIL,subject:'Queshift payment attempt - '+orderId,htmlBody:'<h2>New payment submitted</h2><p><b>Customer:</b> '+html_(user.NAME)+'</p><p><b>Phone:</b> '+html_(user.PHONE)+'</p><p><b>State:</b> '+html_(user.STATE)+'</p><p><b>Plan:</b> '+html_(plan.NAME)+'</p>'+(discountPercent?'<p><b>First Booking Offer:</b> '+discountPercent+'% OFF · '+html_(getSetting_('FIRST_BOOKING_COUPON')||'FIRST20')+'<br><b>Original:</b> ₹'+originalBase+' · <b>Discounted taxable:</b> ₹'+base+'</p>':'')+'<p><b>Amount:</b> ₹'+total+'</p><p><b>Order ID:</b> '+orderId+'</p><p>Open Queshift Admin Panel to view proof and approve.</p>'}); audit_(id.email,'PAYMENT_ATTEMPT',orderId+(discountPercent?' FIRST'+discountPercent:''));
  return{orderId:orderId,status:'PENDING',total:total,baseAmount:base,originalBase:originalBase,discountPercent:discountPercent,coupon:getSetting_('FIRST_BOOKING_COUPON')||'FIRST20'};
}

function adminDashboard_() {
  var settings=settingsObject_(),
      users=rows_('USERS'), payments=rows_('PAYMENTS'), subs=rows_('SUBSCRIPTIONS'),
      blogs=rows_('BLOGS'), helpArticles=rows_('HELP_ARTICLES'), invoices=rows_('INVOICES'), enquiries=rows_('ENQUIRIES'), trialLeads=rows_('TRIAL_LEADS');
  return{
    settings:{
      heroTitle:settings.HERO_TITLE,heroText:settings.HERO_TEXT,phone1:settings.PHONE1,phone2:settings.PHONE2,email:settings.EMAIL,
      gstRate:settings.GST_RATE,supplierState:settings.SUPPLIER_STATE,sellerName:settings.SELLER_NAME,sellerAddress:settings.SELLER_ADDRESS,
      sellerGstin:settings.SELLER_GSTIN,sacCode:settings.SAC_CODE,bankName:settings.BANK_NAME,bankAccount:settings.BANK_ACCOUNT,ifsc:settings.IFSC,msme:settings.MSME,
      firstDiscount:settings.FIRST_BOOKING_DISCOUNT||20,couponCode:settings.FIRST_BOOKING_COUPON||'FIRST20',softwareFileId:settings.SOFTWARE_FILE_ID||'',
      logoUrl:publicMediaUrl_(settings.LOGO_URL||settings.LOGO_FILE_ID),faviconUrl:publicMediaUrl_(settings.FAVICON_URL||settings.FAVICON_FILE_ID),qrUrl:publicMediaUrl_(settings.QR_URL||settings.QR_FILE_ID),
      softwareVersion:settings.SOFTWARE_VERSION,trialDays:settings.TRIAL_DAYS,trialDownloadUrl:settings.TRIAL_DOWNLOAD_URL,
      trialSoftwareFileId:settings.TRIAL_SOFTWARE_FILE_ID,trialRequirements:settings.TRIAL_REQUIREMENTS,trialInstructions:settings.TRIAL_INSTRUCTIONS
    },
    social:parseJson_(settings.SOCIAL_JSON,'{}'),
    plans:rows_('PLANS').map(function(r){return{code:r.CODE,name:r.NAME,price:+r.BASE_PRICE,gstRate:+r.GST_RATE||(+settings.GST_RATE||18),days:+r.DAYS,active:bool_(r.ACTIVE)};}),
    counts:{
      customers:users.length,pendingPayments:payments.filter(function(p){return p.STATUS==='PENDING';}).length,
      activeSubscriptions:subs.filter(function(s){return s.STATUS==='ACTIVE';}).length,
      publishedBlogs:blogs.filter(blogIsPublished_).length,
      publishedHelp:helpArticles.filter(helpIsPublished_).length,
      openEnquiries:enquiries.filter(function(q){return String(q.STATUS||'OPEN').toUpperCase()==='OPEN';}).length,
      trialRequests:trialLeads.length,verifiedTrials:trialLeads.filter(function(t){return bool_(t.VERIFIED);}).length
    },
    banners:publicData_().banners,partners:publicData_().partners,brands:publicData_().brands,videos:publicData_().videos,
    blogs:blogs.map(function(b){return{id:b.ID,title:b.TITLE,slug:b.SLUG,status:b.STATUS};}),
    helpArticles:helpArticles.map(function(h){return{id:h.ID,slug:h.SLUG,category:h.CATEGORY,title:h.TITLE,summary:h.SUMMARY,html:h.HTML,metaTitle:h.META_TITLE,metaDescription:h.META_DESCRIPTION,keywords:h.KEYWORDS,language:h.LANGUAGE,status:h.STATUS};}),
    payments:payments.slice().reverse().map(function(p){return{orderId:p.ORDER_ID,name:p.NAME,phone:p.PHONE,state:p.STATE,plan:p.PLAN,amount:p.TOTAL_AMOUNT,screenshotUrl:p.SCREENSHOT_URL,status:p.STATUS};}),
    reviews:rows_('REVIEWS').concat(rows_('COMMENTS').map(function(c){return{ID:c.ID,NAME:c.NAME,RATING:0,COMMENT:'Blog '+c.BLOG_SLUG+': '+c.COMMENT,STATUS:c.STATUS,REPLY:c.REPLY};})).map(function(r){return{id:r.ID,name:r.NAME,rating:r.RATING,comment:r.COMMENT,status:r.STATUS,reply:r.REPLY};}),
    customers:users.map(function(u){var s=latest_('SUBSCRIPTIONS','USER_EMAIL',u.EMAIL);return{name:u.NAME,email:u.EMAIL,phone:u.PHONE,state:u.STATE,plan:s?s.PLAN:''};}),
    invoices:invoices.slice().reverse().map(function(i){return{invoiceNumber:i.INVOICE_NUMBER,customer:i.CUSTOMER_NAME,total:i.TOTAL,pdfUrl:i.PDF_URL};}),
    enquiries:enquiries.slice().reverse().map(function(q){return{id:q.ID,name:q.NAME,email:q.EMAIL,phone:q.PHONE,company:q.COMPANY,message:q.MESSAGE,status:q.STATUS,reply:q.REPLY,createdAt:formatDateTime_(q.CREATED_AT)};}),
    trialLeads:trialLeads.slice().reverse().map(function(t){return{id:t.ID,name:t.NAME,email:t.EMAIL,phone:t.PHONE,company:t.COMPANY,state:t.STATE,verified:bool_(t.VERIFIED),verifiedAt:formatDateTime_(t.VERIFIED_AT),downloads:+t.DOWNLOAD_COUNT||0,createdAt:formatDateTime_(t.CREATED_AT)};})
  };
}

function saveSettings_(p) {
  var map={
    heroTitle:'HERO_TITLE',heroText:'HERO_TEXT',phone1:'PHONE1',phone2:'PHONE2',email:'EMAIL',gstRate:'GST_RATE',supplierState:'SUPPLIER_STATE',
    sellerName:'SELLER_NAME',sellerAddress:'SELLER_ADDRESS',sellerGstin:'SELLER_GSTIN',sacCode:'SAC_CODE',bankName:'BANK_NAME',bankAccount:'BANK_ACCOUNT',ifsc:'IFSC',msme:'MSME',
    firstDiscount:'FIRST_BOOKING_DISCOUNT',couponCode:'FIRST_BOOKING_COUPON',softwareVersion:'SOFTWARE_VERSION',trialDays:'TRIAL_DAYS',
    trialDownloadUrl:'TRIAL_DOWNLOAD_URL',trialSoftwareFileId:'TRIAL_SOFTWARE_FILE_ID',trialRequirements:'TRIAL_REQUIREMENTS',trialInstructions:'TRIAL_INSTRUCTIONS'
  };
  Object.keys(map).forEach(function(k){if(p[k]!==undefined&&p[k]!=='')setSetting_(map[k],clean_(p[k]));});
  if(p.logo){var logo=saveDataUrl_(p.logo,'Queshift-Logo',getSubfolder_('Public Media'),true);setSetting_('LOGO_URL',logo.publicUrl);setSetting_('LOGO_FILE_ID',logo.id);}
  if(p.favicon){var fav=saveDataUrl_(p.favicon,'Queshift-Favicon',getSubfolder_('Public Media'),true);setSetting_('FAVICON_URL',fav.publicUrl);setSetting_('FAVICON_FILE_ID',fav.id);}
  if(p.qr){var qr=saveDataUrl_(p.qr,'Payment-QR',getSubfolder_('Public Media'),true);setSetting_('QR_FILE_ID',qr.id);setSetting_('QR_URL',qr.publicUrl);}
  if(p.signature){var sig=saveDataUrl_(p.signature,'Authorised-Signature',getSubfolder_('Public Media'),true);setSetting_('SIGNATURE_FILE_ID',sig.id);}
  return{saved:true};
}
function saveSocial_(p){var social={},standard=['youtube','instagram','facebook','linkedin','twitter','awtaxation','whatsapp'];standard.forEach(function(k){social[k]=clean_(p[k]);});social.custom=[];[1,2].forEach(function(i){if(p['customUrl'+i])social.custom.push({label:clean_(p['customLabel'+i])||'Link',icon:clean_(p['customLabel'+i]).slice(0,2)||'+',url:clean_(p['customUrl'+i])});});setSetting_('SOCIAL_JSON',JSON.stringify(social));return{saved:true};}
function savePlan_(p){
  var code=String(p.code||'').toUpperCase().trim().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
  if(!code)code=String(p.name||'PLAN').toUpperCase().trim().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'')||('PLAN_'+Date.now());
  var name=clean_(p.name);if(!name)throw new Error('Plan name is required.');
  var price=+p.price,days=+p.days,gst=+p.gstRate||(+getSetting_('GST_RATE')||18);
  if(!isFinite(price)||price<0)throw new Error('Enter a valid plan price.');if(!isFinite(days)||days<1)throw new Error('Enter valid subscription days.');
  upsertObject_('PLANS','CODE',code,{CODE:code,NAME:name,BASE_PRICE:round_(price),GST_RATE:gst,DAYS:Math.round(days),ACTIVE:bool_(p.active)});
  return{saved:true,code:code};
}
function saveSoftwareFile_(p){
  var id=extractDriveId_(p.softwareFile||p.softwareFileId||'');if(!id)throw new Error('Paste a valid Google Drive software file link or file ID.');
  var file=DriveApp.getFileById(id);setSetting_('SOFTWARE_FILE_ID',id);return{saved:true,fileId:id,name:file.getName(),url:file.getUrl()};
}
function saveBanner_(p){var f=saveDataUrl_(p.image,'Banner-'+Date.now(),getSubfolder_('Public Media'),true);appendObject_('BANNERS',{ID:uuid_(),TITLE:clean_(p.title),IMAGE_URL:f.publicUrl,LINK:clean_(p.link),SORT_ORDER:+p.sortOrder||1,ACTIVE:bool_(p.active),UPDATED_AT:now_()});return{saved:true};}
function savePartner_(p){
  var name=clean_(p.name);if(!name)throw new Error('Partner name is required.');
  var existing=findOne_('PARTNERS','NAME',name),imageUrl=existing?existing.IMAGE_URL:'';
  if(p.image)imageUrl=saveDataUrl_(p.image,'Partner-'+name,getSubfolder_('Public Media'),true).publicUrl;
  var lower=name.toLowerCase(),sortOrder=+p.sortOrder||0;
  if(lower==='ajay kumar')sortOrder=1;else if(lower==='wasim raza')sortOrder=2;else if(!sortOrder)sortOrder=existing?(+existing.SORT_ORDER||rows_('PARTNERS').length+1):rows_('PARTNERS').length+1;
  upsertObject_('PARTNERS','NAME',name,{ID:existing?existing.ID:uuid_(),NAME:name,ROLE:clean_(p.role)||'Co-Owner, Queshift',BIO:clean_(p.bio)||(existing?existing.BIO:''),IMAGE_URL:imageUrl,SORT_ORDER:sortOrder,ACTIVE:true,UPDATED_AT:now_()});
  return{saved:true};
}
function saveBrand_(p){var f=p.image?saveDataUrl_(p.image,'Brand-'+clean_(p.name),getSubfolder_('Public Media'),true):{publicUrl:''};appendObject_('BRANDS',{ID:uuid_(),NAME:clean_(p.name),IMAGE_URL:f.publicUrl,URL:clean_(p.url),SORT_ORDER:+p.sortOrder||1,ACTIVE:true,UPDATED_AT:now_()});return{saved:true};}
function saveVideo_(p){var id=parseVideoId_(p.url);if(!id)throw new Error('Enter a valid YouTube video link.');var meta=youtubeMeta_(id),featured=bool_(p.featured);if(featured)rowsWithNumbers_('VIDEOS').forEach(function(x){if(bool_(x.obj.FEATURED)){sheet_('VIDEOS').getRange(x.row,7).setValue(false);}});appendObject_('VIDEOS',{ID:uuid_(),URL:p.url,VIDEO_ID:id,TITLE:clean_(p.title)||meta.title,DESCRIPTION:clean_(p.description)||meta.description,THUMBNAIL:meta.thumbnail,FEATURED:featured,ACTIVE:bool_(p.active),UPDATED_AT:now_()});return{saved:true};}
function saveBlog_(p){var slug=slugify_(p.slug||p.title),existing=findOne_('BLOGS','SLUG',slug),imageUrl=existing?existing.IMAGE_URL:'';if(p.image)imageUrl=saveDataUrl_(p.image,'Blog-'+slug,getSubfolder_('Public Media'),true).publicUrl;upsertObject_('BLOGS','SLUG',slug,{ID:existing?existing.ID:uuid_(),SLUG:slug,TITLE:clean_(p.title),SUMMARY:clean_(p.summary),HTML:sanitizeHtml_(p.html),IMAGE_URL:imageUrl,META_TITLE:clean_(p.metaTitle)||clean_(p.title),META_DESCRIPTION:clean_(p.metaDescription)||clean_(p.summary),KEYWORDS:clean_(p.keywords),TAGS:clean_(p.tags),STATUS:p.status==='DRAFT'?'DRAFT':'PUBLISHED',PUBLISHED_AT:existing?existing.PUBLISHED_AT:now_(),UPDATED_AT:now_()});return{saved:true,slug:slug};}
function deleteContent_(p){var allowed=['BANNERS','PARTNERS','BRANDS','VIDEOS','BLOGS','HELP_ARTICLES','REVIEWS','COMMENTS'];if(allowed.indexOf(p.type)<0)throw new Error('Invalid content type.');deleteBy_((p.type==='COMMENTS'?'COMMENTS':p.type),'ID',p.id);return{deleted:true};}

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
function contact_(p){
  p=p||{};
  var name=clean_(p.name),
      email=String(p.email||'').trim().toLowerCase(),
      phone=digits_(p.phone),
      company=clean_(p.company),
      message=clean_(p.message);

  if(!name)throw new Error('Name is required.');
  if(!isValidEmail_(email))throw new Error('Enter a valid email address.');
  if(phone.length<10)throw new Error('Enter a valid phone number.');
  if(!message)throw new Error('Message is required.');

  var id=uuid_();
  appendObject_('ENQUIRIES',{
    ID:id,
    NAME:name,
    EMAIL:email,
    PHONE:phone,
    COMPANY:company,
    MESSAGE:message,
    STATUS:'OPEN',
    REPLY:'',
    CREATED_AT:now_(),
    UPDATED_AT:now_()
  });

  MailApp.sendEmail({
    to:getSetting_('EMAIL')||QS_ADMIN_EMAIL,
    subject:'Queshift website enquiry - '+name,
    htmlBody:'<div style="font-family:Arial;padding:22px;color:#102039">'+
      '<h2 style="color:#075bb8">New Website Enquiry</h2>'+
      '<p><b>Name:</b> '+html_(name)+'</p>'+
      '<p><b>Email:</b> '+html_(email)+'</p>'+
      '<p><b>Phone:</b> '+html_(phone)+'</p>'+
      '<p><b>Company:</b> '+html_(company||'-')+'</p>'+
      '<p><b>Message:</b><br>'+html_(message)+'</p>'+
      '<p><b>Enquiry ID:</b> '+html_(id)+'</p></div>'
  });

  try{
    MailApp.sendEmail({
      to:email,
      subject:'We received your Queshift enquiry',
      htmlBody:'<div style="font-family:Arial;max-width:620px;margin:auto;border:1px solid #dbe5f0;border-radius:14px;overflow:hidden">'+
        '<div style="background:#075bb8;color:white;padding:22px"><h2 style="margin:0">Queshift</h2><p style="margin:6px 0 0">E-commerce Accounting & Reconciliation</p></div>'+
        '<div style="padding:24px;color:#102039"><p>Hello <b>'+html_(name)+'</b>,</p>'+
        '<p>Thank you for contacting Queshift. We have received your enquiry and our team will review it.</p>'+
        '<p><b>Your Enquiry ID:</b> '+html_(id)+'</p>'+
        '<p>Support: '+html_(getSetting_('PHONE1'))+' / '+html_(getSetting_('PHONE2'))+'</p></div></div>',
      name:'Queshift by AW Taxation',
      replyTo:getSetting_('EMAIL')||QS_ADMIN_EMAIL
    });
  }catch(_){}

  return{sent:true,enquiryId:id};
}

function enquiryAction_(p){
  p=p||{};
  var id=clean_(p.id), task=String(p.task||'').toUpperCase(), reply=clean_(p.reply);
  var found=findRow_('ENQUIRIES','ID',id);
  if(!found)throw new Error('Enquiry not found.');

  var status='OPEN';
  if(task==='CLOSE')status='CLOSED';
  else if(task==='REOPEN')status='OPEN';
  else if(task==='REPLY')status='REPLIED';
  else throw new Error('Invalid enquiry action.');

  var update={ID:id,STATUS:status,UPDATED_AT:now_()};
  if(task==='REPLY'){
    if(!reply)throw new Error('Reply message is required.');
    update.REPLY=reply;
    if(isValidEmail_(found.obj.EMAIL)){
      MailApp.sendEmail({
        to:found.obj.EMAIL,
        subject:'Queshift response - '+id,
        htmlBody:'<div style="font-family:Arial;max-width:620px;margin:auto">'+
          '<h2 style="color:#075bb8">Queshift Support</h2>'+
          '<p>Hello '+html_(found.obj.NAME||'Customer')+',</p>'+
          '<p>'+html_(reply).replace(/\n/g,'<br>')+'</p>'+
          '<p>Regards,<br><b>Queshift by AW Taxation</b></p></div>',
        name:'Queshift by AW Taxation',
        replyTo:getSetting_('EMAIL')||QS_ADMIN_EMAIL
      });
    }
  }
  upsertObject_('ENQUIRIES','ID',id,update);
  return{saved:true,status:status};
}

function trialPublicConfig_(){
  var downloadUrl=trialResolveDownloadUrl_();
  syncTrialAvailabilityStatuses_(!!downloadUrl);
  return{
    days:+getSetting_('TRIAL_DAYS')||15,
    version:clean_(getSetting_('SOFTWARE_VERSION')),
    requirements:clean_(getSetting_('TRIAL_REQUIREMENTS'))||'64-bit Windows 10 or Windows 11',
    instructions:clean_(getSetting_('TRIAL_INSTRUCTIONS'))||'Queshift trial works only on 64-bit Windows 10/11.',
    downloadReady:!!downloadUrl,
    availability:downloadUrl?'READY':'COMING_SOON',
    message:downloadUrl
      ? 'Queshift Trial Download is available.'
      : 'Coming Soon - Queshift Trial Download is not available yet. Register and verify your email now; when the download becomes available, the same verified email or phone number will get one chance to download the trial.'
  };
}

function trialFindLeadByEmailOrPhone_(email,phone){
  var e=String(email||'').trim().toLowerCase();
  var p=digits_(phone);
  return rows_('TRIAL_LEADS').filter(function(r){
    var sameEmail=e && String(r.EMAIL||'').trim().toLowerCase()===e;
    var samePhone=p && digits_(r.PHONE)===p;
    return sameEmail||samePhone;
  })[0]||null;
}

function trialWasDownloaded_(lead){
  if(!lead)return false;
  return String(lead.AVAILABILITY_STATUS||'').toUpperCase()==='DOWNLOADED'
    || !!lead.DOWNLOAD_GRANTED_AT
    || (+lead.DOWNLOAD_COUNT||0)>0;
}

function syncTrialAvailabilityStatuses_(downloadReady){
  var sh=sheet_('TRIAL_LEADS');
  var headers=QS_HEADERS.TRIAL_LEADS;
  var statusCol=headers.indexOf('AVAILABILITY_STATUS')+1;
  var readyCol=headers.indexOf('READY_AT')+1;
  var updatedCol=headers.indexOf('UPDATED_AT')+1;
  var now=now_();

  rowsWithNumbers_('TRIAL_LEADS').forEach(function(x){
    if(trialWasDownloaded_(x.obj))return;

    var current=String(x.obj.AVAILABILITY_STATUS||'').toUpperCase();
    if(downloadReady){
      if(current!=='READY'){
        sh.getRange(x.row,statusCol).setValue('READY');
        if(!x.obj.READY_AT)sh.getRange(x.row,readyCol).setValue(now);
        sh.getRange(x.row,updatedCol).setValue(now);
      }
    }else{
      if(current==='READY'){
        sh.getRange(x.row,statusCol).setValue('COMING_SOON');
        sh.getRange(x.row,updatedCol).setValue(now);
      }
    }
  });
}

function trialRequestOtp_(p){
  p=p||{};
  var name=clean_(p.name),
      email=String(p.email||'').trim().toLowerCase(),
      phone=digits_(p.phone),
      company=clean_(p.company),
      state=clean_(p.state);

  if(!name)throw new Error('Name is required.');
  if(!company)throw new Error('Firm / Company name is required.');
  if(!isValidEmail_(email))throw new Error('Enter a valid email address.');
  if(phone.length<10)throw new Error('Enter a valid phone number.');

  var downloadReady=!!trialResolveDownloadUrl_();
  syncTrialAvailabilityStatuses_(downloadReady);

  var existing=trialFindLeadByEmailOrPhone_(email,phone);

  if(trialWasDownloaded_(existing)){
    throw new Error('The free trial download has already been used with this email address or phone number.');
  }

  if(existing && existing.OTP_SENT_AT){
    var lastSent=new Date(existing.OTP_SENT_AT);
    if(!isNaN(lastSent.getTime()) && (new Date().getTime()-lastSent.getTime())<60000){
      throw new Error('OTP was just sent. Please wait 60 seconds before requesting another OTP.');
    }
  }

  var otp=String(Math.floor(100000+Math.random()*900000));
  var now=new Date();
  var expiry=new Date(now.getTime()+10*60*1000);
  var id=existing&&existing.ID?existing.ID:uuid_();
  var createdAt=existing&&existing.CREATED_AT?existing.CREATED_AT:now;
  var status=downloadReady?'READY':'COMING_SOON';

  upsertObject_('TRIAL_LEADS','ID',id,{
    ID:id,
    NAME:name,
    EMAIL:email,
    PHONE:phone,
    COMPANY:company,
    STATE:state,
    OTP_HASH:trialOtpHash_(email,otp),
    OTP_EXPIRES_AT:expiry,
    OTP_SENT_AT:now,
    OTP_ATTEMPTS:0,
    VERIFIED:existing?bool_(existing.VERIFIED):false,
    VERIFIED_AT:existing?existing.VERIFIED_AT:'',
    DOWNLOAD_COUNT:existing?(+existing.DOWNLOAD_COUNT||0):0,
    LAST_DOWNLOAD_AT:existing?existing.LAST_DOWNLOAD_AT:'',
    CREATED_AT:createdAt,
    UPDATED_AT:now,
    AVAILABILITY_STATUS:status,
    COMING_SOON_SHOWN_AT:existing?existing.COMING_SOON_SHOWN_AT:'',
    READY_AT:downloadReady?(existing&&existing.READY_AT?existing.READY_AT:now):(existing?existing.READY_AT:''),
    DOWNLOAD_GRANTED_AT:existing?existing.DOWNLOAD_GRANTED_AT:''
  });

  var cfg=trialPublicConfig_();
  MailApp.sendEmail({
    to:email,
    subject:'Queshift Trial Download OTP',
    htmlBody:'<div style="font-family:Arial;max-width:620px;margin:auto;border:1px solid #dbe5f0;border-radius:14px;overflow:hidden">'+
      '<div style="background:#075bb8;color:white;padding:22px"><h2 style="margin:0">Queshift Trial Verification</h2></div>'+
      '<div style="padding:24px;color:#102039"><p>Hello <b>'+html_(name)+'</b>,</p>'+
      '<p>Your OTP for Queshift trial download is:</p>'+
      '<div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#075bb8;margin:18px 0">'+html_(otp)+'</div>'+
      '<p>This OTP is valid for <b>10 minutes</b>.</p>'+
      '<p><b>Trial:</b> '+cfg.days+' days<br>'+
      (cfg.version?'<b>Software Version:</b> '+html_(cfg.version)+'<br>':'')+
      '<b>Requirement:</b> '+html_(cfg.requirements)+'</p>'+
      (!cfg.downloadReady
        ? '<div style="margin-top:16px;padding:14px;border-radius:10px;background:#fff4e5;color:#8a4b08"><b>Coming Soon:</b> The trial download link is not live yet. Your verification will be saved. When the download is released, you may use the same email address or phone number for your one trial-download chance.</div>'
        : '')+
      '<p style="font-size:12px;color:#65758b">Do not share this OTP with anyone.</p></div></div>',
    name:'Queshift by AW Taxation',
    replyTo:getSetting_('EMAIL')||QS_ADMIN_EMAIL
  });

  return{
    otpSent:true,
    email:maskEmail_(email),
    expiresInMinutes:10,
    trial:cfg
  };
}

function trialVerifyOtp_(p){
  p=p||{};
  var email=String(p.email||'').trim().toLowerCase(),
      otp=String(p.otp||'').replace(/\D/g,'');

  if(!isValidEmail_(email))throw new Error('Enter a valid email address.');
  if(!/^\d{6}$/.test(otp))throw new Error('Enter the 6-digit OTP.');

  var existing=findOne_('TRIAL_LEADS','EMAIL',email);
  if(!existing)throw new Error('Trial request was not found. Please request a new OTP.');

  if(trialWasDownloaded_(existing)){
    throw new Error('The free trial download has already been used with this email address or phone number.');
  }

  var attempts=+existing.OTP_ATTEMPTS||0;
  if(attempts>=5)throw new Error('Too many incorrect OTP attempts. Please request a new OTP.');

  var expiry=new Date(existing.OTP_EXPIRES_AT);
  if(isNaN(expiry.getTime()) || expiry.getTime()<new Date().getTime()){
    throw new Error('OTP has expired. Please request a new OTP.');
  }

  var expected=String(existing.OTP_HASH||'');
  var actual=trialOtpHash_(email,otp);
  if(!expected || actual!==expected){
    upsertObject_('TRIAL_LEADS','EMAIL',email,{OTP_ATTEMPTS:attempts+1,UPDATED_AT:now_()});
    throw new Error('OTP is incorrect.');
  }

  var now=now_();
  var downloadUrl=trialGrantDownloadUrl_(existing.EMAIL);
  var cfg=trialPublicConfig_();

  if(!downloadUrl){
    upsertObject_('TRIAL_LEADS','EMAIL',email,{
      VERIFIED:true,
      VERIFIED_AT:existing.VERIFIED_AT||now,
      OTP_ATTEMPTS:attempts,
      AVAILABILITY_STATUS:'COMING_SOON',
      COMING_SOON_SHOWN_AT:existing.COMING_SOON_SHOWN_AT||now,
      UPDATED_AT:now
    });

    try{
      audit_(email,'TRIAL_COMING_SOON_VERIFIED',JSON.stringify({
        company:existing.COMPANY,
        phone:existing.PHONE
      }));
    }catch(_){}

    return{
      verified:true,
      downloadReady:false,
      downloadUrl:'',
      availability:'COMING_SOON',
      message:'Coming Soon - Your details and OTP verification have been saved. When the Queshift trial download becomes available, use the same email address or phone number again. You will still have one trial-download chance.',
      trial:cfg
    };
  }

  var count=(+existing.DOWNLOAD_COUNT||0)+1;
  upsertObject_('TRIAL_LEADS','EMAIL',email,{
    VERIFIED:true,
    VERIFIED_AT:existing.VERIFIED_AT||now,
    OTP_ATTEMPTS:attempts,
    DOWNLOAD_COUNT:count,
    LAST_DOWNLOAD_AT:now,
    AVAILABILITY_STATUS:'DOWNLOADED',
    READY_AT:existing.READY_AT||now,
    DOWNLOAD_GRANTED_AT:now,
    UPDATED_AT:now
  });

  try{
    audit_(email,'TRIAL_DOWNLOAD_GRANTED',JSON.stringify({
      company:existing.COMPANY,
      phone:existing.PHONE,
      downloads:count
    }));
  }catch(_){}

  try{
    MailApp.sendEmail({
      to:getSetting_('ADMIN_EMAIL')||QS_ADMIN_EMAIL,
      subject:'Queshift trial download granted - '+clean_(existing.COMPANY||existing.NAME),
      htmlBody:'<div style="font-family:Arial;color:#102039"><h2 style="color:#075bb8">Trial Download Granted</h2>'+
        '<p><b>Name:</b> '+html_(existing.NAME)+'</p>'+
        '<p><b>Company:</b> '+html_(existing.COMPANY)+'</p>'+
        '<p><b>Email:</b> '+html_(existing.EMAIL)+'</p>'+
        '<p><b>Phone:</b> '+html_(existing.PHONE)+'</p>'+
        '<p><b>State:</b> '+html_(existing.STATE||'-')+'</p></div>'
    });
  }catch(_){}

  return{
    verified:true,
    downloadReady:true,
    downloadUrl:downloadUrl,
    availability:'READY',
    message:'OTP verified. Your one-time Queshift trial download is ready.',
    trial:cfg
  };
}

function trialResolveDownloadUrl_(){
  var direct=clean_(getSetting_('TRIAL_DOWNLOAD_URL'));
  if(direct)return direct;

  var fileId=clean_(getSetting_('TRIAL_SOFTWARE_FILE_ID'));
  if(!fileId)return'';

  try{
    return DriveApp.getFileById(fileId).getUrl();
  }catch(_){
    return'';
  }
}

function trialGrantDownloadUrl_(email){
  var direct=clean_(getSetting_('TRIAL_DOWNLOAD_URL'));
  if(direct)return direct;
  var fileId=clean_(getSetting_('TRIAL_SOFTWARE_FILE_ID'));
  if(!fileId)return'';
  try{
    var file=DriveApp.getFileById(fileId);
    if(isValidEmail_(email))file.addViewer(String(email).trim().toLowerCase());
    return file.getUrl();
  }catch(_){return'';}
}

function getOrCreateTrialOtpSecret_(){
  var props=PropertiesService.getScriptProperties();
  var secret=props.getProperty('TRIAL_OTP_SECRET');
  if(!secret){
    secret=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
    props.setProperty('TRIAL_OTP_SECRET',secret);
  }
  return secret;
}

function trialOtpHash_(email,otp){
  var raw=String(email||'').toLowerCase()+'|'+String(otp||'')+'|'+getOrCreateTrialOtpSecret_();
  var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,raw,Utilities.Charset.UTF_8);
  return digest.map(function(b){var v=b<0?b+256:b;return('0'+v.toString(16)).slice(-2);}).join('');
}

function isValidEmail_(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim());
}

function maskEmail_(email){
  var parts=String(email||'').split('@');
  if(parts.length!==2)return'';
  var name=parts[0];
  var shown=name.length<=2?name.charAt(0):name.slice(0,2);
  return shown+new Array(Math.max(2,name.length-shown.length)+1).join('*')+'@'+parts[1];
}

function formatDateTime_(v){
  return v?Utilities.formatDate(new Date(v),Session.getScriptTimeZone(),'dd-MMM-yyyy hh:mm a'):'';
}

function expireSubscriptions(){rowsWithNumbers_('SUBSCRIPTIONS').forEach(function(x){if(x.obj.STATUS==='ACTIVE'&&new Date(x.obj.EXPIRY_DATE)<new Date()){sheet_('SUBSCRIPTIONS').getRange(x.row,6).setValue('EXPIRED');var fileId=getSetting_('SOFTWARE_FILE_ID');if(fileId)try{DriveApp.getFileById(fileId).removeViewer(x.obj.USER_EMAIL);}catch(e){}}});}

function ss_(){var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');return id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();}
function sheet_(name){var sh=ss_().getSheetByName(name);if(!sh)throw new Error('Run initQueshiftSystem first. Missing sheet: '+name);return sh;}
function ensureSheet_(ss,name,headers){
  var sh=ss.getSheetByName(name)||ss.insertSheet(name);
  if(sh.getLastRow()===0){
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#075bb8').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    return sh;
  }

  // Safe schema upgrade: only append newly-added headers to the right.
  // Existing columns/data are never deleted or reordered.
  var current=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getValues()[0].map(function(v){return String(v||'').trim();});
  headers.forEach(function(h){
    if(current.indexOf(h)<0){
      current.push(h);
      sh.getRange(1,current.length).setValue(h).setFontWeight('bold').setBackground('#075bb8').setFontColor('#ffffff');
    }
  });
  sh.setFrozenRows(1);
  return sh;
}
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

function requireActivationAdmin_(credential) {
  var expected = String(
    PropertiesService
      .getScriptProperties()
      .getProperty('ACTIVATION_ADMIN_CODE') || ''
  );

  if (!expected) {
    throw new Error(
      'Desktop activation security is not configured.'
    );
  }

  if (String(credential || '') !== expected) {
    throw new Error(
      'Master Security Code is incorrect.'
    );
  }
}


function activationFindIssuedByOrder_(orderId) {
  var key = String(orderId || '').trim().toUpperCase();

  return rows_('ACTIVATIONS').filter(function(row) {
    return String(row.ORDER_ID || '').trim().toUpperCase() === key
      && String(row.STATUS || '').toUpperCase() !== 'REVOKED';
  })[0] || null;
}


function activationFindIssuedByMachine_(machineCode) {
  var key = String(machineCode || '').trim().toUpperCase();

  return rows_('ACTIVATIONS').filter(function(row) {
    return String(row.MACHINE_CODE || '').trim().toUpperCase() === key
      && String(row.STATUS || '').toUpperCase() !== 'REVOKED';
  })[0] || null;
}


function activationVerifyOrder_(payload, credential) {
  requireActivationAdmin_(credential);

  payload = payload || {};

  var orderId = String(payload.orderId || '').trim();
  var machineCode = String(payload.machineCode || '')
    .trim()
    .toUpperCase();

  if (!orderId) {
    throw new Error('Website Order ID is required.');
  }

  if (!machineCode) {
    throw new Error('Machine Request Code is required.');
  }

  var payment = findOne_(
    'PAYMENTS',
    'ORDER_ID',
    orderId
  );

  if (!payment) {
    throw new Error(
      'This Website Order ID was not found.'
    );
  }

  var paymentStatus = String(
    payment.STATUS || ''
  ).trim().toUpperCase();

  if (paymentStatus !== 'APPROVED') {
    throw new Error(
      'This Website Order ID is not approved for activation.'
    );
  }

  // Same Order ID cannot activate twice
  if (activationFindIssuedByOrder_(orderId)) {
    throw new Error(
      'This Website Order ID has already been used for activation.'
    );
  }

  // Same Machine Request Code cannot activate twice
  if (activationFindIssuedByMachine_(machineCode)) {
    throw new Error(
      'This Machine Request Code has already been used.'
    );
  }

  var user = findOne_(
    'USERS',
    'EMAIL',
    payment.USER_EMAIL
  ) || {};

  var plan = findOne_(
    'PLANS',
    'CODE',
    payment.PLAN
  ) || {};

  var subscription = findOne_(
    'SUBSCRIPTIONS',
    'ORDER_ID',
    orderId
  ) || {};

  var planDays = Number(
    plan.DAYS || 0
  );

  if (
    !planDays &&
    subscription.START_DATE &&
    subscription.EXPIRY_DATE
  ) {
    try {
      var startDate = new Date(
        subscription.START_DATE
      );

      var expiryDate = new Date(
        subscription.EXPIRY_DATE
      );

      if (
        !isNaN(startDate.getTime()) &&
        !isNaN(expiryDate.getTime())
      ) {
        planDays = Math.max(
          1,
          Math.round(
            (
              expiryDate.getTime()
              - startDate.getTime()
            ) / 86400000
          )
        );
      }
    } catch (_) {}
  }

  return {
    verified: true,

    orderId: orderId,

    email:
      String(payment.USER_EMAIL || ''),

    name:
      String(
        payment.NAME
        || user.NAME
        || ''
      ),

    company:
      String(user.COMPANY || ''),

    phone:
      String(
        payment.PHONE
        || user.PHONE
        || ''
      ),

    plan:
      String(payment.PLAN || ''),

    days:
      planDays,

    paymentStatus:
      paymentStatus
  };
}


function activationCommit_(payload, credential) {

  // Verify again before saving activation
  var verified = activationVerifyOrder_(
    payload,
    credential
  );

  payload = payload || {};

  var licenseId = String(
    payload.licenseId || ''
  ).trim();

  if (!licenseId) {
    throw new Error(
      'License ID is required.'
    );
  }

  var activationDate = String(
    payload.activationDate || ''
  ).trim();

  var endDate = String(
    payload.endDate || ''
  ).trim();

  var days = Number(
    payload.days
    || verified.days
    || 0
  );

  if (
    !activationDate
    || !endDate
    || days <= 0
  ) {
    throw new Error(
      'Activation period is incomplete.'
    );
  }

  appendObject_(
    'ACTIVATIONS',
    {
      ID:
        Utilities.getUuid(),

      ORDER_ID:
        verified.orderId,

      USER_EMAIL:
        verified.email,

      CLIENT_NAME:
        verified.name,

      COMPANY:
        verified.company,

      PLAN:
        verified.plan,

      MACHINE_CODE:
        String(
          payload.machineCode || ''
        ).trim().toUpperCase(),

      LICENSE_ID:
        licenseId,

      ACTIVATION_DATE:
        activationDate,

      EXPIRY_DATE:
        endDate,

      DAYS:
        days,

      STATUS:
        'ISSUED',

      ISSUED_AT:
        now_(),

      UPDATED_AT:
        now_()
    }
  );

  try {

    audit_(
      QS_ADMIN_EMAIL,
      'DESKTOP_ACTIVATION',
      JSON.stringify({
        orderId:
          verified.orderId,

        email:
          verified.email,

        machineCode:
          String(
            payload.machineCode || ''
          ).trim().toUpperCase(),

        licenseId:
          licenseId,

        days:
          days
      })
    );

  } catch (_) {}


  return {

    committed: true,

    orderId:
      verified.orderId,

    licenseId:
      licenseId,

    clientName:
      verified.company
      || verified.name,

    email:
      verified.email,

    plan:
      verified.plan,

    days:
      days
  };
}
