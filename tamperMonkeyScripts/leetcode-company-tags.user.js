// ==UserScript==
// @name         LeetCode Company Tags (visor-leetcode)
// @namespace    https://github.com/AvAkanksh
// @version      2.0.2
// @description  Shows which companies ask the LeetCode problem you're solving (with logos), using data from visor-leetcode. Also adds company filtering/sorting on the problemset page.
// @author       AvAkanksh
// @match        https://leetcode.com/problems/*
// @match        https://leetcode.com/problemset/*
// @match        https://leetcode.cn/problems/*
// @icon         https://leetcode.com/favicon-32x32.png
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      otnygskksrekalrjtwqj.supabase.co
// @connect      cdn.simpleicons.org
// @connect      autocomplete.clearbit.com
// @connect      www.google.com
// @connect      unavatar.io
// @connect      t2.gstatic.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const SUPABASE_URL = "https://otnygskksrekalrjtwqj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_u2_Zj4oEiuJmzRKL9n4CAg_eIsJaTvO";
  const COMPANY_DOMAINS = {   "1kosmos": "kosmosq.com",   "6sense": "6sense.com",   "accelya": "accelya.com",   "accenture": "accenture.com",   "accolite": "accolite.com",   "acko": "acko.com",   "acorns": "acorns.com",   "activision": "activision.com",   "adobe": "adobe.com",   "adp": "adp.com",   "aetion": "aetion.com",   "affinity": "affinity.co",   "affirm": "affirm.com",   "agoda": "agoda.com",   "airbnb": "airbnb.com",   "airbus": "airbus.com",   "airtel": "airtel.in",   "airwallex": "airwallex.com",   "akamai": "akamai.com",   "akuna-capital": "akunacapital.com",   "alibaba": "alibaba.com",   "alphonso": "alphonsomango.in",   "alten": "altenew.com",   "altimetrik": "altimetrik.com",   "amadeus": "amadeus.com",   "amazon": "amazon.com",   "amd": "amd.com",   "amdocs": "amdocs.com",   "american-airlines": "aa.com",   "american-express": "americanexpress.com",   "amplitude": "amplitude.com",   "analytics-quotient": "aqinsights.com",   "andela": "andela.com",   "anduril": "anduril.com",   "anthropic": "anthropics.com",   "anyscale": "anyscale.com",   "aon": "aon.com",   "apolloio": "apollo.io",   "appdynamics": "digitalwaiter.info",   "appfolio": "appfolio.com",   "apple": "apple.com",   "applied-intuition": "appliedintuition.com",   "applovin": "applovin.com",   "aqr-capital-management": "aqr.com",   "arcesium": "arcesium.com",   "argo-ai": "argo.ai",   "arista-networks": "arista.com",   "asana": "asana.com",   "ascend": "ascendertx.com",   "at-t": "att.com",   "athenahealth": "athenahealth.com",   "atlassian": "atlassian.com",   "att": "att.com",   "attentive": "attentive.com",   "audible": "audible.com",   "auriga": "aurigait.com",   "aurora": "aurorasolar.com",   "autodesk": "autodesk.com",   "avalara": "avalara.com",   "avito": "avito.ru",   "axis-bank": "axisbank.com",   "axon": "axonify.com",   "baidu": "baidu.com",   "bank-of-america": "chicagomarathon.com",   "barclays": "barclays.co.uk",   "bcg": "bc.game",   "bending-spoons": "bendingspoons.com",   "bill-com": "bill.com",   "bitgo": "bitgo.com",   "blackbuck": "blackbuck.com",   "blackrock": "blackrock.com",   "blackstone": "blackstone.com",   "blend": "blender.org",   "blinkit": "blinkit.com",   "bloomberg": "bloomberg.com",   "bloomreach": "bloomreach.com",   "blue-origin": "blueorigin.com",   "bnp-paribas": "bnpparibas.pl",   "bny-mellon": "bnymellon.com",   "boeing": "boeing.com",   "bolt": "bolt.com",   "bookingcom": "booking.com",   "box": "box.com",   "bp": "bpi.ir",   "braze": "braze.com",   "bridgewater-associates": "bridgewater.com",   "brillio": "brillio.com",   "broadcom": "broadcom.com",   "browserstack": "browserstack.com",   "bt-group": "bt.com",   "buyhatke": "buyhatke.com",   "bytedance": "bytedance.com",   "c3-ai": "caixa.gov.br",   "cadence": "cadence.com",   "canonical": "canonical.com",   "canva": "canva.com",   "capgemini": "capgemini.com",   "capital-one": "capitalone.com",   "careem": "careem.com",   "cars24": "cars.com",   "carwale": "carwale.com",   "cashfree": "cashfree.com",   "caterpillar": "cat.com",   "cerner": "cerner.com",   "chalo": "chalo.com",   "chargebee": "chargebee.com",   "checkpoint": "checkpoint.com",   "chewy": "chewy.com",   "chime": "chime.com",   "chubb": "chubb.com",   "ciena": "ciena.com",   "circle": "circlek.com",   "cisco": "cisco.com",   "citadel": "citadelbanking.com",   "citi": "citi.com",   "citrix": "citrix.com",   "clari": "clarivate.com",   "cleartrip": "cleartrip.com",   "clevertap": "clevertap.com",   "cloudera": "cloudera.com",   "cloudflare": "cloudflare.com",   "clutter": "clutter.com",   "cme-group": "cmegroup.com",   "cockroach-labs": "cockroachlabs.com",   "code-studio": "code-studio.com",   "coditas": "coditas.com",   "cognizant": "cognizant.com",   "cohesity": "cohesity.com",   "coinbase": "coinbase.com",   "coindcx": "coindcx.com",   "comcast": "comcast.com",   "commvault": "commvault.com",   "compass": "compass.com",   "confluent": "confluent.io",   "couchbase": "couchbase.com",   "coupa": "coupang.com",   "coupang": "coupang.com",   "coursera": "coursera.org",   "coveo": "coveo.com",   "cred": "creditkarma.com",   "credit-karma": "creditkarma.com",   "criteo": "criteo.com",   "crowdstrike": "crowdstrike.com",   "ctc": "ctc.ru",   "curefit": "curefit.jp",   "cvent": "cvent.com",   "cyntexa": "cyntexa.com",   "cyware": "cyware.com",   "dailyhunt": "dailyhunt.in",   "darwinbox": "darwinbox.in",   "dataart": "dataart.com",   "databricks": "databricks.com",   "datadog": "datadoghq.com",   "dataminr": "dataminr.com",   "de-shaw": "deshaw.com",   "deepmind": "drchristinavillarreal.com",   "delhivery": "delhivery.com",   "deliveroo": "deliveroo.co.uk",   "dell": "dell.com",   "deloitte": "deloitte.com",   "deltax": "deltaxml.com",   "deutsche-bank": "deutsche-bank.de",   "devrev": "devrev.ai",   "dialpad": "dialpad.com",   "didi": "didichuxing.com",   "directi": "directindustry.com",   "discord": "discord.com",   "discovery": "discovery.com",   "disney": "disneyplus.com",   "dji": "dji.com",   "docusign": "docusign.com",   "doordash": "doordash.com",   "dp-world": "dpworld.com",   "drawbridge": "drawbridgecreative.com",   "dream11": "dreamstime.com",   "dropbox": "dropbox.com",   "druva": "druva.com",   "drw": "drweil.com",   "dtcc": "dtcc.edu",   "dunzo": "dunzo.com",   "duolingo": "duolingo.com",   "earnin": "earningswhispers.com",   "ebay": "ebay.com",   "edelweiss": "edelweiss.plus",   "electronic-arts": "ea.com",   "elitmus": "elitmus.com",   "envoy": "envoy.com",   "epam-systems": "epam.com",   "epic-games": "epicgames.com",   "epic-systems": "epicsystems.tech",   "epifi": "epi-fps.ca",   "equinix": "equinix.com",   "ericsson": "ericsson.com",   "etsy": "etsy.com",   "exl": "exlibrisgroup.com",   "expedia": "expediagroup.com",   "ey": "eyebuydirect.com",   "f5-networks": "f1-networks.com",   "factset": "factset.com",   "factwise": "factwisehealth.com",   "faire": "faire.com",   "fallible": "fallible.co",   "fanatics": "fanatics.com",   "fast": "fastcompany.com",   "fastenal": "fastenal.com",   "fico": "fi.co",   "fidelity": "fidelity.com",   "fidessa": "fidessales.com",   "figma": "figma.com",   "fiverr": "fiverr.com",   "fivetran": "fivetran.com",   "flatiron-health": "flatiron.com",   "fleetx": "fleetx.io",   "flexera": "flexera.com",   "flexport": "flexport.com",   "flipkart": "flipkart.com",   "ford": "ford.com",   "fortinet": "fortinet.com",   "forusall": "forusall.com",   "fourkites": "fourkites.com",   "fpt": "fptshop.com.vn",   "fractal-analytics": "fractalanalytics.com",   "freecharge": "freecharge.in",   "freshworks": "freshworks.com",   "fynd": "fynd.com",   "gainsight": "gainsight.com",   "gameskraft": "gameskraft.com",   "garena": "garena.com",   "garmin": "garmin.com",   "gartner": "gartner.com",   "ge-digital": "geodigitalimaging.com",   "ge-healthcare": "gehealthcare.com",   "geico": "geico.com",   "general-electric": "ge.com",   "general-motors": "gm.com",   "genpact": "genpact.com",   "gilt-groupe": "gilt.jp",   "github": "github.com",   "glassdoor": "glassdoor.com",   "globallogic": "globallogic.com",   "globant": "globant.com",   "glovo": "glovoapp.com",   "godaddy": "godaddy.com",   "gojek": "gojek.com",   "goldman-sachs": "goldmansachs.com",   "google": "google.com",   "gopuff": "gopuff.com",   "goto": "goto.com",   "grab": "grabagun.com",   "grammarly": "grammarly.com",   "graviton": "gravitonlit.com",   "groupon": "groupon.com",   "groww": "groww.in",   "grubhub": "grubhub.com",   "gsa-capital": "gsa.cl",   "gsn-games": "gsngames.com",   "guidewire": "guidewire.com",   "gusto": "gusto.com",   "harness": "harness.io",   "hashedin": "hashedin.com",   "hbo": "hbomax.com",   "hcl": "hclib.org",   "helix": "helixsleep.com",   "hertz": "hertz.com",   "highspot": "highspot.com",   "hilabs": "hilabs.com",   "hive": "hive.co",   "honey": "joinhoney.com",   "honeywell": "honeywell.com",   "hopper": "hopper.com",   "hotstar": "hotstar.com",   "houzz": "houzz.com",   "hp": "hp.com",   "hpe": "hpe.com",   "hrt": "hrt.hr",   "hsbc": "hsbc.com",   "htc": "htc.com",   "huawei": "huawei.com",   "hubspot": "hubspot.com",   "hulu": "hulu.com",   "ibm": "ibm.com",   "iit-bombay": "iitb.ac.in",   "imc": "imcu.com",   "impact-analytics": "impactanalytics.co",   "impetus": "impetusgurukul.com",   "increff": "increff.com",   "indeed": "indeed.com",   "info-edge": "infoedge.in",   "informatica": "informatica.com",   "infosys": "infosys.com",   "inmobi": "inmobi.com",   "innovaccer": "innovaccer.com",   "instabase": "instabase.jp",   "instacart": "instacart.com",   "intel": "intel.com",   "interactive-brokers": "interactivebrokers.com",   "intercom": "intercom.com",   "intuit": "intuit.com",   "ivp": "ivpress.com",   "ixigo": "ixigo.com",   "ixl": "ixl.com",   "jane-street": "janestreet.com",   "jd": "jdpower.com",   "jeavio": "jeavio.com",   "jetbrains": "jetbrains.com",   "jio": "jio.com",   "josh-technology": "joshtechnologygroup.com",   "jpmorgan": "jpmorgan.com",   "jtg": "jtgtravel.com",   "jump-trading": "jumptrading.com",   "junglee-games": "jungleegames.com",   "juspay": "juspay.in",   "justworks": "justworks.com",   "kakao": "kakaocorp.com",   "karat": "karatemart.com",   "keeptruckin": "keeptruckingsafe.org",   "kickdrum": "kickdrum.com",   "kla": "klaviyo.com",   "kla-tencor": "gsemi.com",   "kotak-mahindra-bank": "kotak.com",   "kpit": "kpit.com",   "kpmg": "kpmg.ca",   "lacework": "lacework.com",   "larsen-toubro": "larsentoubro.com",   "lendingkart": "lendingkart.com",   "lenskart": "lenskart.com",   "lg-electronics": "lg.com",   "liberty-mutual": "libertymutual.com",   "liftoff": "liftoff.io",   "lime": "limelush.com",   "line": "line.me",   "linkedin": "linkedin.com",   "liveramp": "liveramp.com",   "livspace": "livspace.com",   "lowe": "lowes.com",   "lti": "l-tike.com",   "lucid": "lucidchart.com",   "luxoft": "luxoft.com",   "lyft": "lyft.com",   "machine-zone": "mz.com",   "machinezone": "mz.com",   "maersk": "maersk.com",   "makemytrip": "makemytrip.com",   "mapbox": "mapbox.com",   "maq-software": "maqsoftware.com",   "marqeta": "marqeta.com",   "mastercard": "mastercard.com.au",   "mathworks": "mathworks.com",   "mcafee": "mcafee.com",   "mcdonalds": "mcdonalds.com",   "mckinsey": "mckinsey.com",   "medianet": "media.net",   "meesho": "meesho.com",   "meituan": "meituan.com",   "mercari": "mercari.com",   "meta": "metacritic.com",   "micro1": "office.com",   "microsoft": "office.com",   "microstrategy": "microstrategy.com",   "millennium": "meevo.com",   "mindtickle": "mindtickle.com",   "mindtree": "mindtreeschool.com",   "mishipay": "mishipay.com",   "mitsogo": "mitsogo.com",   "mixpanel": "mixpanel.com",   "mobileye": "mobileye.com",   "mobisy": "mobisystems.com",   "moengage": "moengage.com",   "moloco": "moloco.com",   "moneylion": "moneylion.com",   "mongodb": "mongodb.com",   "morgan-stanley": "morganstanley.com",   "motive": "gomotive.com",   "moveworks": "moveworks.com",   "mphasis": "mphasis.com",   "msci": "mscdirect.com",   "murex": "murex.com",   "mykaarma": "mykaarma.com",   "myntra": "myntra.com",   "nagarro": "nagarro.com",   "nasdaq": "nasdaq.com",   "national-instruments": "ni.com",   "natwest": "natwest.com",   "navan": "navanafurniture.com",   "naver": "naver.com",   "navi": "navient.com",   "ncr": "ncr.com",   "nerdwallet": "nerdwallet.com",   "netapp": "netapp.com",   "netease": "163.com",   "netflix": "netflix.com",   "netskope": "netskope.com",   "netsuite": "netsuite.com",   "newsbreak": "newsbreak.com",   "nextdoor": "nextdoor.com",   "nextjump": "nextjump.com",   "nference": "nference.com",   "niantic": "nianticlabs.com",   "nielsen": "nielsen.com",   "nike": "nike.com",   "nokia": "nokia.com",   "noon": "noon.com",   "nordstrom": "nordstrom.com",   "notion": "notion.so",   "npci": "npci.org.in",   "nuro": "nuro.jp",   "nutanix": "nutanix.com",   "nvidia": "nvidia.com",   "nykaa": "nykaa.com",   "observeai": "observe.ai",   "odoo": "odoo.com",   "okta": "okta.com",   "okx": "okx.com",   "ola": "olasjobs.org",   "olx": "olx.pl",   "openai": "openai.com",   "opentext": "opentext.com",   "oppo": "myopportunity.com",   "optiver": "optiver.com",   "optum": "optum.com",   "oracle": "oracle.com",   "otterai": "otter.ai",   "oyo": "oyorooms.com",   "ozon": "ozon.ru",   "palantir": "palantir.com",   "palantir-technologies": "palantir.com",   "palo-alto-networks": "paloaltonetworks.com",   "park": "parkes.nsw.gov.au",   "patreon": "patreon.com",   "paycom": "paycomet.com",   "paypal": "paypal.com",   "paypay": "paypay.ne.jp",   "paytm": "paytm.com",   "payu": "payubiz.in",   "peak6": "peakdesign.com",   "pega": "pega.com",   "peloton": "onepeloton.com",   "persistent-systems": "persistent.com",   "philips": "philips.com",   "phonepe": "phonepe.com",   "pickrr": "pickrr.com",   "pinterest": "pinterest.com",   "plaid": "plaid.com",   "playsimple": "playsimple.in",   "pocket-gems": "pocketgems.com",   "point72": "1point3acres.com",   "polar": "polaris.com",   "ponyai": "pony.ai",   "porter": "porter.in",   "poshmark": "poshmark.com",   "postman": "postman.com",   "postmates": "postmates.com",   "poynt": "poynter.org",   "practo": "practo.com",   "publicis-sapient": "publicissapient.com",   "pubmatic": "pubmatic.com",   "pure": "purewow.com",   "pure-storage": "purestorage.com",   "purplle": "purplle.com",   "pwc": "pwc.com",   "qualcomm": "qualcomm.com",   "qualtrics": "qualtrics.com",   "qualys": "qualys.com",   "quantcast": "quantcast.com",   "quantiphi": "quantiphi.com",   "quince": "quinceanera-boutique.com",   "quora": "quora.com",   "rackspace": "rackspace.com",   "radius": "radiustheme.com",   "rakuten": "rakuten.com",   "rally-health": "rallyhealth.com",   "ramp-2": "ramp.com",   "razorpay": "razorpay.com",   "rbc": "rbc.ru",   "redbus": "redbus.in",   "reddit": "reddit.com",   "redfin": "redfin.com",   "remitly": "remitly.com",   "retailmenot": "retailmenot.com",   "revolut": "revolutionehr.com",   "riot-games": "riotgames.com",   "ripple": "ripplematch.com",   "rippling": "rippling.com",   "rivian": "rivian.com",   "robinhood": "robinhood.com",   "roblox": "roblox.com",   "rokt": "rokt.com",   "roku": "roku.com",   "rubrik": "rubrik.com",   "salesforce": "salesforce.com",   "sambanova": "sambanova.ai",   "samsara": "samsara.com",   "samsung": "samsung.com",   "sap": "sap.com",   "scale-ai": "scale.com",   "scaler": "scaler.com",   "schlumberger": "slb.com",   "schneider-electric": "se.com",   "schrodinger": "schrodinger.com",   "sentry": "sentry.io",   "servicenow": "servicenow.com",   "sharechat": "sharechat.com",   "shift-technology": "shift-technology.com",   "shipsy": "shipsy.io",   "shopback": "shopback.com.tw",   "shopee": "shopee.tw",   "shopify": "shopify.com",   "shopup": "shopupz.com",   "siemens": "siemens.com",   "sig": "signupgenius.com",   "sigmoid": "sigmoid.com",   "singlestore": "singlestore.com",   "sixt": "sixt.com",   "slice": "slicelife.com",   "smartnews": "smartnews.com",   "smartsheet": "smartsheet.com",   "snapchat": "snapchat.com",   "snapdeal": "snapdeal.com",   "snowflake": "snowflake.com",   "societe-generale": "societegenerale.com",   "sofi": "sofi.com",   "softwire": "softwire.com",   "sonatus": "sonatus.com",   "sony": "sony.com",   "soti": "soti.net",   "soundhound": "midomi.com",   "spacex": "spacex.com",   "spinny": "spinny.com",   "splunk": "splunk.com",   "spotify": "spotify.com",   "sprinklr": "sprinklr.com",   "square": "squarespace.com",   "squarepoint-capital": "squarepoint-capital.com",   "squarespace": "squarespace.com",   "src": "srcity.org",   "stackadapt": "stackadapt.com",   "stackline": "stackline.com",   "starbucks": "starbucks.com",   "state-farm": "statefarm.com",   "strava": "strava.com",   "stripe": "stripe.com",   "sumologic": "sumologic.com",   "swiggy": "swiggy.com",   "syfe": "syfe.com",   "symantec": "symantechvac.com",   "synopsys": "synopsys.com",   "ta-digital": "taonlinetraining.com",   "tableau": "tableau.com",   "tanium": "tanium.com",   "target": "target.com",   "tcs": "tcs.com",   "tech-mahindra": "techmahindra.com",   "tekion": "tekion.com",   "tencent": "tencent.com",   "teradata": "teradata.com",   "tesco": "tesco.com",   "tesla": "tesla.com",   "texas-instruments": "ti.com",   "the-trade-desk": "thetradedesk.com",   "thomson-reuters": "thomsonreuters.com",   "thoughtspot": "thoughtspot.com",   "thoughtworks": "thoughtworks.com",   "thousandeyes": "thousandeyes.com",   "thumbtack": "thumbtack.com",   "tiaa": "tiaa.org",   "tiger-analytics": "tigeranalytics.com",   "tiktok": "tiktok.com",   "tinder": "tinder.com",   "tinkoff": "tinkoff.ru",   "toast": "toasttab.com",   "tokopedia": "tokopedia.com",   "tomtom": "tomtom.com",   "toptal": "toptal.com",   "tower-research": "tower-research.com",   "tracxn": "tracxn.com",   "traveloka": "traveloka.com",   "trend-micro": "trendmicro.com",   "trexquant": "trexquant.com",   "trilogy": "trilogyhs.com",   "tripadvisor": "tripadvisor.com",   "triplebyte": "triplebyte.com",   "turing": "turing.com",   "turo": "turo.com",   "turvo": "turvo.com",   "tusimple": "tusimple.com",   "twilio": "twilio.com",   "twitch": "twitch.tv",   "twitter": "twitter.com",   "two-sigma": "twosigma.com",   "uber": "uber.com",   "ubisoft": "ubisoft.com",   "ubs": "ubs.com",   "udemy": "udemy.com",   "uipath": "uipath.com",   "ukg": "ukg.com",   "unbxd": "unbxd.com",   "unity": "unity.cn",   "unstop": "unstoppabledomains.com",   "upstart": "upstart.com",   "urban-company": "urbancompany.com",   "ust": "ustraveldocs.com",   "valve": "dota2.com",   "veeva": "veeva.com",   "verily": "verilymag.com",   "veritas": "veritaspress.com",   "verizon": "verizon.com",   "verkada": "verkada.com",   "viasat": "viasat.com",   "vimeo": "vimeo.com",   "virtu": "virtualtourist.com",   "virtusa": "virtusa.com",   "visa": "visa.com",   "vk": "vk.com",   "vmware": "vmware.com",   "warnermedia": "warner-media.de",   "watchguard": "watchguard.com",   "wayfair": "wayfair.com",   "waymo": "waymo.com",   "wayve": "wayvent.com",   "wealthfront": "wealthfront.com",   "wells-fargo": "wellsfargo.com",   "weride": "weride.ai",   "western-digital": "westerndigital.com",   "whatfix": "whatfix.com",   "whatnot": "whatnot.com",   "winzo": "winzogames.com",   "wipro": "healthplan.com",   "wise": "wise.com",   "wish": "wish.com",   "wissen": "wissenschaft.de",   "wix": "wix.com",   "workday": "workday.com",   "works-applications": "worksap.co.jp",   "worldquant": "wqu.edu",   "woven-by-toyota": "woven.toyota",   "xing": "xing.com",   "yahoo": "yahoo.com",   "yandex": "yandex.ru",   "yatra": "yatra.com",   "yelp": "yelp.com",   "yext": "yext.com",   "yugabyte": "yugabyte.com",   "zalando": "zalando.de",   "zappos": "zappos.com",   "zemoso": "zemosolabs.com",   "zendesk": "zendesk.com",   "zepto": "zeptonow.com",   "zeta": "zetaglobal.com",   "zillow": "zillow.com",   "zip": "ziprecruiter.com",   "ziprecruiter": "ziprecruiter.com",   "zluri": "zluri.com",   "zocdoc": "zocdoc.com",   "zoho": "zohocorp.com",   "zomato": "zomato.com",   "zoom": "zoominfo.com",   "zoox": "zoox.com",   "zopsmart": "zopsmart.com",   "zscaler": "zscaler.com",   "zulily": "zulily.com",   "zynga": "zynga.com" };
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  const CONTAINER_ID = "lc-company-tags";

  const TIMEFRAME_ORDER = {
    "thirty-days": 0,
    "three-months": 1,
    "six-months": 2,
  };

  let lastPath = null;
  let activeContainer = null;
  let currentDbVersion = null;

  // problemset state
  const psState = {
    map: null, // slug -> companies[]
    companies: null, // [{id,name}]
    selectedCompany: "",
    filterEnabled: false,
    sortBy: "default",
    annotating: false,
  };

  injectStyle();
  init();
  window.addEventListener("load", init);
  hookSpaNavigation(init);
  observeDom();

  function init() {
    if (isProblemPage()) {
      if (lastPath === location.pathname) return;
      lastPath = location.pathname;
      runProblemPage().catch((e) => console.error("[LC CompanyTags] fatal", e));
      return;
    }
    if (isProblemsetPage()) {
      if (lastPath === location.pathname) {
        // still ensure annotation
        annotateProblemset().catch(() => {});
        return;
      }
      lastPath = location.pathname;
      runProblemsetPage().catch((e) => console.error("[LC CompanyTags] fatal", e));
      return;
    }
    // other pages
    removeContainer();
    lastPath = null;
  }

  /* ===================== PROBLEM PAGE ===================== */

  async function runProblemPage() {
    const slug = getSlug();
    if (!slug) return;
    removeContainer();

    const containerPromise = mountContainer();
    const companiesPromise = fetchCompanies(slug);

    const container = await containerPromise;
    if (getSlug() !== slug) return;
    activeContainer = container;

    renderLoading(container);

    let companies = [];
    try {
      companies = await companiesPromise;
    } catch (e) {
      console.error("[LC CompanyTags] fetch failed", e);
    }
    if (getSlug() !== slug) return;
    renderCompanies(container, companies);
  }

  /* ===================== PROBLEMSET PAGE ===================== */

  async function runProblemsetPage() {
    injectProblemsetToolbar();
    // load data in background
    try {
      const [map, companies] = await Promise.all([
        fetchAllProblemCompanyMap(),
        fetchCompaniesList(),
      ]);
      psState.map = map;
      psState.companies = companies;
      populateCompanySelect();
    } catch (e) {
      console.error("[LC CompanyTags] problemset data failed", e);
    }
    annotateProblemset();
  }

  function injectProblemsetToolbar() {
    if (document.getElementById("lc-ct-ps-toolbar")) return;
    const firstCard = document.querySelector('a[data-e2e-locator="question-list-row"]');
    const anchor = firstCard ? firstCard.parentElement : document.querySelector("table");
    if (!anchor) {
      // retry later
      setTimeout(injectProblemsetToolbar, 500);
      return;
    }
    const toolbar = document.createElement("div");
    toolbar.id = "lc-ct-ps-toolbar";
    toolbar.className = "lc-ct-ps-toolbar";

    const label = document.createElement("span");
    label.className = "lc-ct-ps-label";
    label.textContent = "Company:";
    toolbar.appendChild(label);

    const select = document.createElement("select");
    select.id = "lc-ct-ps-company";
    select.className = "lc-ct-ps-select";
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All companies";
    select.appendChild(allOpt);
    select.addEventListener("change", () => {
      psState.selectedCompany = select.value;
      psState.filterEnabled = !!select.value;
      annotateProblemset();
      applyProblemsetFilter();
      if (select.value) {
        renderCompanyResults(select.value).catch((e) =>
          console.error("[LC CompanyTags] results failed", e)
        );
      } else {
        clearCompanyResults();
      }
    });
    toolbar.appendChild(select);

    const sortLabel = document.createElement("span");
    sortLabel.className = "lc-ct-ps-label";
    sortLabel.textContent = "Sort:";
    sortLabel.style.marginLeft = "12px";
    toolbar.appendChild(sortLabel);

    const sortSelect = document.createElement("select");
    sortSelect.id = "lc-ct-ps-sort";
    sortSelect.className = "lc-ct-ps-select";
    [
      { v: "default", t: "Default" },
      { v: "count", t: "Company count (desc)" },
      { v: "name", t: "Company name" },
    ].forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.v;
      opt.textContent = o.t;
      sortSelect.appendChild(opt);
    });
    sortSelect.addEventListener("change", () => {
      psState.sortBy = sortSelect.value;
      applyProblemsetSort();
    });
    toolbar.appendChild(sortSelect);

    const status = document.createElement("span");
    status.id = "lc-ct-ps-status";
    status.className = "lc-ct-ps-status";
    status.textContent = "Loading companies…";
    toolbar.appendChild(status);

    anchor.parentElement.insertBefore(toolbar, anchor);
  }

  function populateCompanySelect() {
    const select = document.getElementById("lc-ct-ps-company");
    if (!select || !psState.companies) return;
    // keep first "All companies"
    while (select.options.length > 1) select.remove(1);
    psState.companies.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    const status = document.getElementById("lc-ct-ps-status");
    if (status) status.textContent = "";
  }

  async function annotateProblemset() {
    if (psState.annotating) return;
    psState.annotating = true;
    try {
      const map = psState.map || (await fetchAllProblemCompanyMap());
      psState.map = map;

      const rows = Array.from(document.querySelectorAll('a[data-e2e-locator="question-list-row"]'));
      const fallback = rows.length ? rows : Array.from(document.querySelectorAll('a[href^="/problems/"]'));
      for (const row of fallback) {
        const slug =
          row.getAttribute("data-e2e-slug") ||
          (row.getAttribute("href") || "").match(/\/problems\/([^/?]+)/)?.[1];
        if (!slug) continue;
        const decoded = decodeURIComponent(slug);

        if (row.dataset.lcCtSlug === decoded && row.dataset.lcCtDone === "1") continue;

        const oldBadges = row.querySelector(".lc-ct-ps-badges");
        if (oldBadges) oldBadges.remove();

        const companies = map[decoded] || [];

        row.dataset.lcCtSlug = decoded;
        row.dataset.lcCtCompanies = companies.map((c) => c.name).join(",");
        row.dataset.lcCtCount = String(companies.length);

        const badges = document.createElement("div");
        badges.className = "lc-ct-ps-badges";
        for (const c of companies.slice(0, 6)) {
          badges.appendChild(buildBadge(c, true));
        }
        if (companies.length > 6) {
          const more = document.createElement("span");
          more.className = "lc-ct-badge lc-ct-badge--more";
          more.textContent = `+${companies.length - 6}`;
          more.title = companies.slice(6).map((c) => c.name).join(", ");
          badges.appendChild(more);
        }
        // append into the row's text/content area
        const content = row.querySelector(".flex-1") || row;
        content.appendChild(badges);

        row.dataset.lcCtDone = "1";
      }
      applyProblemsetFilter();
    } finally {
      psState.annotating = false;
    }
  }

  function applyProblemsetFilter() {
    const rows = Array.from(document.querySelectorAll('a[data-e2e-locator="question-list-row"]'));
    const selected = psState.selectedCompany;
    const enabled = psState.filterEnabled && !!selected;
    for (const row of rows) {
      if (!row.dataset.lcCtDone) continue;
      const companies = (row.dataset.lcCtCompanies || "").split(",").filter(Boolean);
      if (enabled) {
        row.style.display = companies.includes(selected) ? "" : "none";
      } else {
        row.style.display = "";
      }
    }
    applyProblemsetSort();
  }

  function applyProblemsetSort() {
    const cards = Array.from(document.querySelectorAll('a[data-e2e-locator="question-list-row"]'));
    if (!cards.length || psState.sortBy === "default") return;
    const parent = cards[0].parentElement;
    if (!parent) return;
    const sorted = cards.slice().sort((a, b) => {
      if (psState.sortBy === "count") {
        return Number(b.dataset.lcCtCount || 0) - Number(a.dataset.lcCtCount || 0);
      }
      if (psState.sortBy === "name") {
        const an = (a.dataset.lcCtCompanies || "").split(",")[0] || "";
        const bn = (b.dataset.lcCtCompanies || "").split(",")[0] || "";
        return an.localeCompare(bn);
      }
      return 0;
    });
    sorted.forEach((r) => parent.appendChild(r));
  }

  async function renderCompanyResults(companyName) {
    let panel = document.getElementById("lc-ct-ps-results");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "lc-ct-ps-results";
      panel.className = "lc-ct-ps-results";
      const firstCard = document.querySelector('a[data-e2e-locator="question-list-row"]');
      if (firstCard && firstCard.parentElement) {
        firstCard.parentElement.insertBefore(panel, firstCard);
      } else {
        document.body.appendChild(panel);
      }
    }
    panel.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "lc-ct-ps-status";
    loading.textContent = "Loading " + companyName + " problems…";
    panel.appendChild(loading);

    const companies = psState.companies || (await fetchCompaniesList());
    psState.companies = companies;
    const company = companies.find((c) => c.name === companyName);
    if (!company) {
      panel.textContent = "Company not found.";
      return;
    }

    const problems = await fetchCompanyProblems(company.id);
    panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "lc-ct-ps-results-header";
    header.textContent = companyName + " — " + problems.length + " problems";
    panel.appendChild(header);

    const list = document.createElement("div");
    list.className = "lc-ct-ps-results-list";
    for (const p of problems) {
      const item = document.createElement("div");
      item.className = "lc-ct-ps-results-item";

      const link = document.createElement("a");
      link.href = p.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = p.title || p.url;
      item.appendChild(link);

      if (p.difficulty) {
        const diff = document.createElement("span");
        diff.className = "lc-ct-panel-diff lc-ct-panel-diff-" + p.difficulty.toLowerCase();
        diff.textContent = p.difficulty;
        item.appendChild(diff);
      }
      if (p.timeframe) {
        const tf = document.createElement("span");
        tf.className = "lc-ct-panel-tf";
        tf.textContent = p.timeframe;
        item.appendChild(tf);
      }
      list.appendChild(item);
    }
    panel.appendChild(list);
  }

  function clearCompanyResults() {
    const panel = document.getElementById("lc-ct-ps-results");
    if (panel) panel.remove();
  }

  /* ===================== DATA ===================== */

  function isProblemPage() {
    return /^\/problems\/[^/]+/.test(location.pathname);
  }

  function isProblemsetPage() {
    return location.pathname.startsWith("/problemset");
  }

  function getSlug() {
    const m = location.pathname.match(/\/problems\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function cacheKey(slug) {
    return "lc_ct_" + slug;
  }

  async function getDbVersion() {
    const cached = GM_getValue("lc_ct_db_version", null);
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
      return cached.version || null;
    }
    const version = await new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: SUPABASE_URL + "/rest/v1/app_metadata?select=last_db_update&id=eq.1",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
        },
        timeout: 10000,
        onload: (res) => {
          try {
            const json = JSON.parse(res.responseText);
            resolve((Array.isArray(json) && json[0] && json[0].last_db_update) || null);
          } catch (e) {
            resolve(null);
          }
        },
        onerror: () => resolve(null),
        ontimeout: () => resolve(null),
      });
    });
    currentDbVersion = version;
    GM_setValue("lc_ct_db_version", { version, ts: Date.now() });
    return version;
  }

  async function fetchCompanies(slug) {
    const version = await getDbVersion();
    const cached = GM_getValue(cacheKey(slug), null);
    if (cached && cached.v === version && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.companies || [];
    }

    const url =
      SUPABASE_URL +
      "/rest/v1/problems?select=company_problems(timeframe_tag,company:companies(name))&url=eq." +
      encodeURIComponent("https://leetcode.com/problems/" + slug);

    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
        },
        timeout: 15000,
        onload: (res) => {
          try {
            const json = JSON.parse(res.responseText);
            let row = Array.isArray(json) ? json[0] : null;

            if (!row) {
              const fallbackUrl =
                SUPABASE_URL +
                "/rest/v1/problems?select=company_problems(timeframe_tag,company:companies(name))&url=ilike.*" +
                encodeURIComponent(slug) +
                "*";
              GM_xmlhttpRequest({
                method: "GET",
                url: fallbackUrl,
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: "Bearer " + SUPABASE_KEY,
                },
                timeout: 15000,
                onload: (res2) => {
                  try {
                    const json2 = JSON.parse(res2.responseText);
                    const target = "https://leetcode.com/problems/" + slug;
                    const row2 =
                      (Array.isArray(json2) &&
                        (json2.find((r) => r && r.url === target) || json2[0])) ||
                      null;
                    finishWithRow(row2, cached, slug, resolve);
                  } catch (e) {
                    resolve((cached && cached.companies) || []);
                  }
                },
                onerror: () => resolve((cached && cached.companies) || []),
                ontimeout: () => resolve((cached && cached.companies) || []),
              });
              return;
            }

            finishWithRow(row, cached, slug, resolve);
          } catch (e) {
            console.error("[LC CompanyTags] parse error", e);
            resolve((cached && cached.companies) || []);
          }
        },
        onerror: () => resolve((cached && cached.companies) || []),
        ontimeout: () => resolve((cached && cached.companies) || []),
      });
    });
  }

  function finishWithRow(row, cached, slug, resolve) {
    try {
      const cps = (row && row.company_problems) || [];
      const companies = cps
        .map((cp) => ({
          name: cp && cp.company ? cp.company.name : null,
          timeframe: cp ? cp.timeframe_tag : null,
        }))
        .filter((c) => !!c.name);

      const seen = new Set();
      const unique = [];
      for (const c of companies) {
        if (seen.has(c.name)) continue;
        seen.add(c.name);
        unique.push(c);
      }

      unique.sort((a, b) => {
        const ra = TIMEFRAME_ORDER[a.timeframe] != null ? TIMEFRAME_ORDER[a.timeframe] : 3;
        const rb = TIMEFRAME_ORDER[b.timeframe] != null ? TIMEFRAME_ORDER[b.timeframe] : 3;
        if (ra !== rb) return ra - rb;
        return String(a.name).localeCompare(String(b.name));
      });

      GM_setValue(cacheKey(slug), { companies: unique, ts: Date.now(), v: currentDbVersion });
      resolve(unique);
    } catch (e) {
      console.error("[LC CompanyTags] parse error", e);
      resolve((cached && cached.companies) || []);
    }
  }

  async function fetchAllProblemCompanyMap() {
    const version = await getDbVersion();
    const cached = GM_getValue("lc_ct_all_map", null);
    if (cached && cached.v === version && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.map || {};
    }
    const map = {};
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const url =
        SUPABASE_URL +
        "/rest/v1/problems?select=url,company_problems(company:companies(name))&limit=" +
        pageSize +
        "&offset=" +
        from;
      const page = await new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: "Bearer " + SUPABASE_KEY,
          },
          timeout: 30000,
          onload: (res) => {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              resolve([]);
            }
          },
          onerror: () => resolve([]),
          ontimeout: () => resolve([]),
        });
      });
      if (!Array.isArray(page) || page.length === 0) break;
      for (const row of page) {
        if (!row || !row.url) continue;
        const m = row.url.match(/\/problems\/([^/]+)/);
        if (!m) continue;
        const slug = decodeURIComponent(m[1]);
        const cps = row.company_problems || [];
        const companies = [];
        const seen = new Set();
        for (const cp of cps) {
          const name = cp && cp.company ? cp.company.name : null;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          companies.push({ name, timeframe: cp.timeframe_tag || null });
        }
        companies.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        map[slug] = companies;
      }
      if (page.length < pageSize) break;
      from += pageSize;
    }
    GM_setValue("lc_ct_all_map", { map, ts: Date.now(), v: currentDbVersion });
    return map;
  }

  async function fetchCompaniesList() {
    const version = await getDbVersion();
    const cached = GM_getValue("lc_ct_companies_list", null);
    if (cached && cached.v === version && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.list || [];
    }
    const list = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const url =
        SUPABASE_URL +
        "/rest/v1/companies?select=id,name&order=name.asc&limit=" +
        pageSize +
        "&offset=" +
        from;
      const page = await new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: "Bearer " + SUPABASE_KEY,
          },
          timeout: 30000,
          onload: (res) => {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              resolve([]);
            }
          },
          onerror: () => resolve([]),
          ontimeout: () => resolve([]),
        });
      });
      if (!Array.isArray(page) || page.length === 0) break;
      list.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    GM_setValue("lc_ct_companies_list", { list, ts: Date.now(), v: currentDbVersion });
    return list;
  }

  /* ===================== UI (problem page) ===================== */

  function findAnchor() {
    return (
      document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector("div.text-title-large") ||
      document.querySelector('div[class*="text-title-large"]') ||
      document.querySelector("h1")
    );
  }

  function mountContainer() {
    return new Promise((resolve) => {
      const tryMount = () => {
        const anchor = findAnchor();
        if (anchor) {
          const container = document.createElement("div");
          container.id = CONTAINER_ID;
          if (anchor.getAttribute && anchor.getAttribute("data-track-load") === "description_content") {
            if (anchor.parentElement) {
              anchor.parentElement.insertBefore(container, anchor);
            } else {
              document.body.appendChild(container);
              container.classList.add("lc-ct-floating");
            }
          } else {
            anchor.insertAdjacentElement("afterend", container);
          }
          resolve(container);
          return true;
        }
        return false;
      };

      if (tryMount()) return;

      let attempts = 0;
      const iv = setInterval(() => {
        attempts++;
        if (tryMount()) {
          clearInterval(iv);
        } else if (attempts > 50) {
          clearInterval(iv);
          const container = document.createElement("div");
          container.id = CONTAINER_ID;
          container.classList.add("lc-ct-floating");
          document.body.appendChild(container);
          resolve(container);
        }
      }, 200);
    });
  }

  function removeContainer() {
    const el = document.getElementById(CONTAINER_ID);
    if (el) el.remove();
    activeContainer = null;
  }

  function renderLoading(container) {
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "lc-ct-wrap";
    const title = document.createElement("div");
    title.className = "lc-ct-title";
    title.textContent = "Company Tags";
    wrap.appendChild(title);
    const loading = document.createElement("div");
    loading.className = "lc-ct-loading";
    loading.textContent = "Loading companies…";
    wrap.appendChild(loading);
    container.appendChild(wrap);
  }

  function renderCompanies(container, companies) {
    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "lc-ct-wrap";

    const title = document.createElement("div");
    title.className = "lc-ct-title";
    title.textContent = "Company Tags";
    const count = document.createElement("span");
    count.className = "lc-ct-count";
    count.textContent = companies.length ? `(${companies.length})` : "";
    title.appendChild(count);
    wrap.appendChild(title);

    if (!companies || !companies.length) {
      const empty = document.createElement("div");
      empty.className = "lc-ct-empty";
      empty.textContent = "No company tags found for this problem.";
      wrap.appendChild(empty);
      container.appendChild(wrap);
      return;
    }

    const list = document.createElement("div");
    list.className = "lc-ct-list";
    for (const c of companies) {
      list.appendChild(buildBadge(c, false));
    }
    wrap.appendChild(list);

    const footer = document.createElement("div");
    footer.className = "lc-ct-footer";
    const link = document.createElement("a");
    link.href = "https://hitarth-gg.github.io/visor-leetcode/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "visor-leetcode";
    footer.appendChild(document.createTextNode("Data: "));
    footer.appendChild(link);
    wrap.appendChild(footer);

    container.appendChild(wrap);
  }

  async function resolveCompanyDomain(name) {
    const key = "lc_ct_domain_" + String(name).toLowerCase();
    const cached = GM_getValue(key, null);
    if (cached && cached.domain) return cached.domain;
    // static mapping (official website domains) built from visor-leetcode company list
    if (COMPANY_DOMAINS && COMPANY_DOMAINS[name]) {
      const d = COMPANY_DOMAINS[name];
      GM_setValue(key, { domain: d, ts: Date.now() });
      return d;
    }

    // small delay to avoid Clearbit rate limits when many badges render at once
    await new Promise((r) => setTimeout(r, 150));

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      const result = await new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url:
            "https://autocomplete.clearbit.com/v1/companies/suggest?query=" +
            encodeURIComponent(String(name).replace(/-/g, " ")),
          timeout: 10000,
          onload: (res) => {
            if (res.status === 429) {
              resolve({ retry: true, domain: null });
              return;
            }
            try {
              const json = JSON.parse(res.responseText);
              resolve({ retry: false, domain: (Array.isArray(json) && json[0] && json[0].domain) || null });
            } catch (e) {
              resolve({ retry: false, domain: null });
            }
          },
          onerror: () => resolve({ retry: false, domain: null }),
          ontimeout: () => resolve({ retry: false, domain: null }),
        });
      });
      if (result.retry) {
        await new Promise((r) => setTimeout(r, 1000 * attempts));
        continue;
      }
      if (result.domain) {
        GM_setValue(key, { domain: result.domain, ts: Date.now() });
        return result.domain;
      }
      return null;
    }
    return null;
  }

  async function fetchLogoDataUrl(domain) {
    const key = "lc_ct_logodata_" + String(domain).toLowerCase();
    const cached = GM_getValue(key, null);
    if (cached && cached.dataUrl) return cached.dataUrl;

    const dataUrl = await new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: "GET",
        url:
          "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://" +
          encodeURIComponent(domain) +
          "&size=128",
        responseType: "blob",
        timeout: 15000,
        onload: (res) => {
          try {
            const blob = res.response;
            if (!(blob instanceof Blob)) {
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          } catch (e) {
            resolve(null);
          }
        },
        onerror: () => resolve(null),
        ontimeout: () => resolve(null),
      });
    });

    if (dataUrl) GM_setValue(key, { dataUrl, ts: Date.now() });
    return dataUrl;
  }

  function buildBadge(c, small) {
    const badge = document.createElement("span");
    badge.className =
      "lc-ct-badge" + (small ? " lc-ct-badge--sm" : "");
    badge.title = c.name;

    const img = document.createElement("img");
    img.className = "lc-ct-logo";
    img.alt = c.name;
    img.loading = "eager";
    img.style.display = "none";
    img.addEventListener("load", () => {
      text.style.display = "none";
      img.style.display = "";
    });
    img.addEventListener("error", () => {
      img.style.display = "none";
      text.style.display = "";
    });
    badge.appendChild(img);

    // Resolve a real company domain (Clearbit) and use Google's favicon service
    // for an accurate logo; falls back to initials on any failure.
    resolveCompanyDomain(c.name).then(async (domain) => {
      if (!domain) {
        text.style.display = "";
        return;
      }
      img.onerror = () => {
        if (!img.dataset.triedGoogle) {
          img.dataset.triedGoogle = "1";
          img.src =
            "https://www.google.com/s2/favicons?domain=" +
            encodeURIComponent(domain) +
            "&sz=32";
        } else {
          img.style.display = "none";
          text.style.display = "";
        }
      };
      // Prefer a locally cached data URL (fetched once, then stored in GM storage)
      const cachedDataUrl = await fetchLogoDataUrl(domain);
      if (cachedDataUrl) {
        img.src = cachedDataUrl;
      } else {
        img.src =
        "https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://" +
        encodeURIComponent(domain) +
        "&size=128";
      }
    });

    const text = document.createElement("span");
    text.className = "lc-ct-badge-text";
    text.textContent = c.name;
    text.style.display = "none";
    badge.appendChild(text);

    return badge;
  }

  function logoUrl(name) {
    // try simpleicons (best-effort; falls back to initials on error)
    const slug = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
    return "https://cdn.simpleicons.org/" + slug;
  }

  function colorForCompany(name) {
    // deterministic color
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#8b5cf6", "#ec4899"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  }

  function ensureMounted() {
    if (!isProblemPage()) return;
    if (document.getElementById(CONTAINER_ID)) return;
    const slug = getSlug();
    if (!slug) return;
    mountContainer().then((container) => {
      if (getSlug() !== slug) return;
      activeContainer = container;
      const cached = GM_getValue(cacheKey(slug), null);
      if (cached && cached.companies) {
        renderCompanies(container, cached.companies);
      } else {
        renderLoading(container);
        fetchCompanies(slug).then((cs) => {
          if (getSlug() === slug) renderCompanies(container, cs);
        });
      }
    });
  }

  /* ===================== SPA / DOM ===================== */

  /* ===================== FLOATING PANEL ===================== */

  function injectFloatingPanel() {
    if (document.getElementById("lc-ct-fab")) return;

    const fab = document.createElement("button");
    fab.id = "lc-ct-fab";
    fab.className = "lc-ct-fab";
    fab.textContent = "Companies";
    fab.addEventListener("click", toggleFloatingPanel);
    document.body.appendChild(fab);

    const panel = document.createElement("div");
    panel.id = "lc-ct-panel";
    panel.className = "lc-ct-panel";
    panel.style.display = "none";
    panel.innerHTML = `
      <div class="lc-ct-panel-header">
        <span>Company Questions</span>
        <button id="lc-ct-panel-close" class="lc-ct-panel-close" type="button">✕</button>
      </div>
      <div class="lc-ct-panel-controls">
        <select id="lc-ct-panel-company" class="lc-ct-ps-select"></select>
        <input id="lc-ct-panel-search" class="lc-ct-panel-search" type="text" placeholder="Search problems…" />
      </div>
      <div id="lc-ct-panel-status" class="lc-ct-ps-status"></div>
      <div id="lc-ct-panel-list" class="lc-ct-panel-list"></div>
    `;
    document.body.appendChild(panel);

    const closeBtn = document.getElementById("lc-ct-panel-close");
    if (closeBtn) closeBtn.addEventListener("click", () => (panel.style.display = "none"));

    const companySelect = document.getElementById("lc-ct-panel-company");
    if (companySelect) {
      companySelect.addEventListener("change", () => {
        loadCompanyProblems(companySelect.value);
      });
    }
    const search = document.getElementById("lc-ct-panel-search");
    if (search) {
      search.addEventListener("input", () => filterPanelList(search.value));
    }

    // populate companies
    (async () => {
      try {
        const companies = psState.companies || (await fetchCompaniesList());
        psState.companies = companies;
        if (!companySelect) return;
        companies.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.name;
          opt.textContent = c.name;
          companySelect.appendChild(opt);
        });
        const status = document.getElementById("lc-ct-panel-status");
        if (status) status.textContent = "Select a company to see its problems.";
      } catch (e) {
        console.error("[LC CompanyTags] panel companies failed", e);
      }
    })();
  }

  function toggleFloatingPanel() {
    const panel = document.getElementById("lc-ct-panel");
    if (!panel) return;
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
  }

  async function loadCompanyProblems(companyName) {
    const listEl = document.getElementById("lc-ct-panel-list");
    const status = document.getElementById("lc-ct-panel-status");
    if (!listEl) return;
    if (!companyName) {
      listEl.innerHTML = "";
      if (status) status.textContent = "Select a company to see its problems.";
      return;
    }
    listEl.innerHTML = "";
    if (status) status.textContent = "Loading…";

    const companies = psState.companies || (await fetchCompaniesList());
    const company = companies.find((c) => c.name === companyName);
    if (!company) {
      if (status) status.textContent = "Company not found.";
      return;
    }

    const problems = await fetchCompanyProblems(company.id);
    if (status) status.textContent = `${problems.length} problems`;
    renderCompanyProblemList(problems);
  }

  async function fetchCompanyProblems(companyId) {
    const cacheKey = "lc_ct_cp_" + companyId;
    const cached = GM_getValue(cacheKey, null);
    const version = await getDbVersion();
    if (cached && cached.v === version && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.list || [];
    }
    const all = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const url =
        SUPABASE_URL +
        "/rest/v1/company_problems?select=problem:problems(title,url,difficulty),timeframe_tag&company_id=eq." +
        companyId +
        "&limit=" +
        pageSize +
        "&offset=" +
        from;
      const page = await new Promise((resolve) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: "Bearer " + SUPABASE_KEY,
          },
          timeout: 30000,
          onload: (res) => {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              resolve([]);
            }
          },
          onerror: () => resolve([]),
          ontimeout: () => resolve([]),
        });
      });
      if (!Array.isArray(page) || page.length === 0) break;
      all.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }
    const list = all
      .map((cp) => ({
        title: cp && cp.problem ? cp.problem.title : null,
        url: cp && cp.problem ? cp.problem.url : null,
        difficulty: cp && cp.problem ? cp.problem.difficulty : null,
        timeframe: cp ? cp.timeframe_tag : null,
      }))
      .filter((p) => !!p.url);
    GM_setValue(cacheKey, { list, ts: Date.now(), v: currentDbVersion });
    return list;
  }

  function renderCompanyProblemList(problems) {
    const listEl = document.getElementById("lc-ct-panel-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    for (const p of problems) {
      const item = document.createElement("div");
      item.className = "lc-ct-panel-item";
      item.dataset.title = (p.title || "").toLowerCase();

      const link = document.createElement("a");
      link.href = p.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = p.title || p.url;
      item.appendChild(link);

      if (p.difficulty) {
        const diff = document.createElement("span");
        diff.className = "lc-ct-panel-diff lc-ct-panel-diff-" + p.difficulty.toLowerCase();
        diff.textContent = p.difficulty;
        item.appendChild(diff);
      }
      if (p.timeframe) {
        const tf = document.createElement("span");
        tf.className = "lc-ct-panel-tf";
        tf.textContent = p.timeframe;
        item.appendChild(tf);
      }
      listEl.appendChild(item);
    }
  }

  function filterPanelList(q) {
    const listEl = document.getElementById("lc-ct-panel-list");
    if (!listEl) return;
    const query = (q || "").toLowerCase().trim();
    Array.from(listEl.children).forEach((item) => {
      const title = item.dataset.title || "";
      item.style.display = !query || title.includes(query) ? "" : "none";
    });
  }

  function observeDom() {
    if (window.__lcCtObserver) window.__lcCtObserver.disconnect();
    const obs = new MutationObserver(
      debounce(() => {
        if (isProblemPage()) ensureMounted();
        if (isProblemsetPage()) {
          injectProblemsetToolbar();
          annotateProblemset().catch(() => {});
        }
      }, 400)
    );
    obs.observe(document.body, { childList: true, subtree: true });
    window.__lcCtObserver = obs;
  }

  function hookSpaNavigation(onNav) {
    const fire = () => setTimeout(onNav, 500);
    const _push = history.pushState;
    const _replace = history.replaceState;
    history.pushState = function (...args) {
      _push.apply(this, args);
      fire();
    };
    history.replaceState = function (...args) {
      _replace.apply(this, args);
      fire();
    };
    window.addEventListener("popstate", fire);
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function injectStyle() {
    const style = document.createElement("style");
    style.textContent = `
      #${CONTAINER_ID} { margin: 12px 0 16px 0; width: 100%; }
      #${CONTAINER_ID}.lc-ct-floating { position: fixed; bottom: 16px; right: 16px; z-index: 9999; max-width: 320px; }
      .lc-ct-wrap { background: rgba(17,24,39,0.04); border: 1px solid rgba(127,127,127,0.25); border-radius: 10px; padding: 10px 12px; font-family: inherit; }
      .lc-ct-title { font-size: 13px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; color: inherit; }
      .lc-ct-count { font-size: 12px; font-weight: 400; opacity: 0.7; }
      .lc-ct-list { display: flex; flex-wrap: wrap; gap: 6px; }
      .lc-ct-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 0; border: none; background: transparent; color: #6366f1; white-space: nowrap; }
      .lc-ct-badge--recent { background: rgba(16,185,129,0.12); color: #10b981; border-color: rgba(16,185,129,0.35); }
      .lc-ct-badge--sm { font-size: 10px; padding: 1px 6px; }
      .lc-ct-badge--more { background: rgba(127,127,127,0.12); color: inherit; border-color: rgba(127,127,127,0.3); }
      .lc-ct-logo { width: 12px; height: 12px; border-radius: 2px; object-fit: contain; }
      .lc-ct-initial { width: 12px; height: 12px; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; color: #fff; font-weight: 700; }
      .lc-ct-loading, .lc-ct-empty { font-size: 12px; opacity: 0.7; padding: 4px 0; }
      .lc-ct-footer { margin-top: 8px; font-size: 11px; opacity: 0.6; }
      .lc-ct-footer a { color: inherit; text-decoration: underline; }
      .lc-ct-ps-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px 0; padding: 8px 10px; border: 1px solid rgba(127,127,127,0.25); border-radius: 8px; background: rgba(17,24,39,0.03); }
      .lc-ct-ps-label { font-size: 12px; font-weight: 600; }
      .lc-ct-ps-select { font-size: 12px; padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(127,127,127,0.3); background: transparent; color: inherit; }
      .lc-ct-ps-status { font-size: 11px; opacity: 0.7; margin-left: auto; }
      .lc-ct-ps-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
      .lc-ct-ps-results { margin: 12px 0; border: 1px solid rgba(127,127,127,0.25); border-radius: 10px; padding: 10px 12px; background: rgba(17,24,39,0.03); }
      .lc-ct-ps-results-header { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
      .lc-ct-ps-results-list { max-height: 40vh; overflow-y: auto; }
      .lc-ct-ps-results-item { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 4px 0; border-bottom: 1px solid rgba(127,127,127,0.12); font-size: 12px; }
      .lc-ct-ps-results-item a { color: #6366f1; text-decoration: none; flex: 1; }
      .lc-ct-ps-results-item a:hover { text-decoration: underline; }
      .lc-ct-fab { position: fixed; bottom: 20px; left: 20px; z-index: 9998; background: #6366f1; color: #fff; border: none; border-radius: 999px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .lc-ct-panel { position: fixed; bottom: 70px; left: 20px; z-index: 9999; width: 360px; max-height: 70vh; display: flex; flex-direction: column; background: #fff; border: 1px solid rgba(127,127,127,0.3); border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); overflow: hidden; font-family: inherit; }
      .lc-ct-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-weight: 600; font-size: 13px; border-bottom: 1px solid rgba(127,127,127,0.2); }
      .lc-ct-panel-close { background: transparent; border: none; font-size: 14px; cursor: pointer; color: inherit; }
      .lc-ct-panel-controls { display: flex; gap: 8px; padding: 8px 12px; border-bottom: 1px solid rgba(127,127,127,0.2); }
      .lc-ct-panel-search { flex: 1; font-size: 12px; padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(127,127,127,0.3); background: transparent; color: inherit; }
      .lc-ct-panel-list { overflow-y: auto; padding: 8px 12px; flex: 1; }
      .lc-ct-panel-item { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 6px 0; border-bottom: 1px solid rgba(127,127,127,0.12); font-size: 12px; }
      .lc-ct-panel-item a { color: #6366f1; text-decoration: none; flex: 1; }
      .lc-ct-panel-item a:hover { text-decoration: underline; }
      .lc-ct-panel-diff { font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px; }
      .lc-ct-panel-diff-easy { color: #22c55e; background: rgba(34,197,94,0.14); }
      .lc-ct-panel-diff-medium { color: #f59e0b; background: rgba(245,158,11,0.14); }
      .lc-ct-panel-diff-hard { color: #ef4444; background: rgba(239,68,68,0.14); }
      .lc-ct-panel-tf { font-size: 10px; opacity: 0.6; }
      @media (prefers-color-scheme: dark) {
        .lc-ct-panel { background: #1f2937; color: #f3f4f6; }
      }
      @media (prefers-color-scheme: dark) {
        .lc-ct-wrap { background: rgba(255,255,255,0.04); }
        .lc-ct-ps-toolbar { background: rgba(255,255,255,0.03); }
      }
    `;
    document.head.appendChild(style);
  }
})();
