import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type Locale = "en" | "bn"

type TranslationDict = Record<string, { en: string; bn: string }>

const translations: TranslationDict = {
  // Navigation
  home: { en: "Home", bn: "হোম" },
  shop: { en: "Shop", bn: "শপ" },
  categories: { en: "Categories", bn: "ক্যাটাগরি" },
  trackOrder: { en: "Track Order", bn: "অর্ডার ট্র্যাক" },
  cart: { en: "Cart", bn: "কার্ট" },
  ownerLogin: { en: "Owner", bn: "মালিক" },
  search: { en: "Search", bn: "খুঁজুন" },
  searchPlaceholder: { en: "Search products...", bn: "পণ্য খুঁজুন..." },

  // Hero
  shopNow: { en: "Shop Now", bn: "এখন কিনুন" },
  viewAll: { en: "View All", bn: "সব দেখুন" },
  newArrivals: { en: "New Arrivals", bn: "নতুন এসেছে" },
  featuredCollections: { en: "Featured Collections", bn: "ফিচার্ড কালেকশন" },
  latestUploads: { en: "Latest Uploads", bn: "সর্বশেষ আপলোড" },
  shopByCategory: { en: "Shop by Category", bn: "ক্যাটাগরি অনুযায়ী কিনুন" },

  // Product
  addToCart: { en: "Add to Cart", bn: "কার্টে যোগ করুন" },
  askOnWhatsApp: { en: "Ask on WhatsApp", bn: "হোয়াটসঅ্যাপে জিজ্ঞাসা" },
  selectSize: { en: "Select Size", bn: "সাইজ নির্বাচন করুন" },
  selectColor: { en: "Select Color", bn: "রং নির্বাচন করুন" },
  inStock: { en: "In Stock", bn: "স্টকে আছে" },
  outOfStock: { en: "Out of Stock", bn: "স্টকে নেই" },
  lowStock: { en: "Only {n} left!", bn: "মাত্র {n}টি বাকি!" },
  description: { en: "Description", bn: "বিবরণ" },
  relatedProducts: { en: "You May Also Like", bn: "আপনার পছন্দ হতে পারে" },
  price: { en: "Price", bn: "মূল্য" },
  quantity: { en: "Quantity", bn: "পরিমাণ" },
  size: { en: "Size", bn: "সাইজ" },
  color: { en: "Color", bn: "রং" },

  // Cart
  yourCart: { en: "Your Cart", bn: "আপনার কার্ট" },
  emptyCart: { en: "Your cart is empty", bn: "আপনার কার্ট খালি" },
  continueShopping: { en: "Continue Shopping", bn: "কেনাকাটা চালিয়ে যান" },
  subtotal: { en: "Subtotal", bn: "সাবটোটাল" },
  deliveryCharge: { en: "Delivery Charge", bn: "ডেলিভারি চার্জ" },
  total: { en: "Total", bn: "মোট" },
  checkout: { en: "Checkout", bn: "চেকআউট" },
  remove: { en: "Remove", bn: "সরান" },

  // Checkout
  checkoutTitle: { en: "Checkout", bn: "চেকআউট" },
  fullName: { en: "Full Name", bn: "পুরো নাম" },
  phoneNumber: { en: "Phone Number", bn: "ফোন নম্বর" },
  address: { en: "Full Address", bn: "পুরো ঠিকানা" },
  district: { en: "District", bn: "জেলা" },
  deliveryArea: { en: "Delivery Area", bn: "ডেলিভারি এলাকা" },
  insideDhaka: { en: "Inside Dhaka", bn: "ঢাকার ভিতরে" },
  outsideDhaka: { en: "Outside Dhaka", bn: "ঢাকার বাইরে" },
  paymentMethod: { en: "Payment Method", bn: "পেমেন্ট পদ্ধতি" },
  cashOnDelivery: { en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
  bkash: { en: "bKash", bn: "বিকাশ" },
  bkashInstructions: { en: "Send money to this bKash number:", bn: "এই বিকাশ নম্বরে টাকা পাঠান:" },
  bkashTrxId: { en: "bKash Transaction ID", bn: "বিকাশ ট্রানজেকশন আইডি" },
  orderNotes: { en: "Order Notes (optional)", bn: "অর্ডার নোট (ঐচ্ছিক)" },
  placeOrder: { en: "Place Order", bn: "অর্ডার করুন" },
  placingOrder: { en: "Placing order...", bn: "অর্ডার হচ্ছে..." },

  // Order confirmation
  orderPlaced: { en: "Order Placed!", bn: "অর্ডার সফল!" },
  orderNumber: { en: "Your Order Number", bn: "আপনার অর্ডার নম্বর" },
  orderSuccessMsg: { en: "We will contact you soon to confirm your order.", bn: "আমরা শীঘ্রই আপনার অর্ডার নিশ্চিত করতে যোগাযোগ করব।" },
  trackYourOrder: { en: "Track Your Order", bn: "আপনার অর্ডার ট্র্যাক করুন" },

  // Order tracking
  trackOrderTitle: { en: "Track Your Order", bn: "অর্ডার ট্র্যাক করুন" },
  enterPhoneToTrack: { en: "Enter your phone number to see your orders", bn: "আপনার অর্ডার দেখতে ফোন নম্বর দিন" },
  findOrders: { en: "Find Orders", bn: "অর্ডার খুঁজুন" },
  noOrdersFound: { en: "No orders found for this phone number", bn: "এই ফোন নম্বরে কোন অর্ডার নেই" },
  orderStatus: { en: "Status", bn: "স্ট্যাটাস" },
  orderDate: { en: "Order Date", bn: "অর্ডারের তারিখ" },
  items: { en: "Items", bn: "আইটেম" },

  // Order statuses
  statusPending: { en: "Pending", bn: "অপেক্ষমাণ" },
  statusConfirmed: { en: "Confirmed", bn: "নিশ্চিত" },
  statusShipped: { en: "Shipped", bn: "প্রেরিত" },
  statusDelivered: { en: "Delivered", bn: "ডেলিভার হয়েছে" },
  statusCancelled: { en: "Cancelled", bn: "বাতিল" },
  paymentPending: { en: "Payment Pending", bn: "পেমেন্ট বাকি" },
  paymentPaid: { en: "Paid", bn: "পরিশোধিত" },

  // Service promises
  codAvailable: { en: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
  codDesc: { en: "Pay when you receive", bn: "পেয়ে দিন পণ্য পাওয়ার পর" },
  bkashPayment: { en: "bKash Accepted", bn: "বিকাশ গ্রহণযোগ্য" },
  bkashDesc: { en: "Easy mobile payment", bn: "সহজ মোবাইল পেমেন্ট" },
  nationwideDelivery: { en: "Nationwide Delivery", bn: "সারাদেশে ডেলিভারি" },
  nationwideDesc: { en: "All 64 districts", bn: "৬৪ জেলায়" },
  easyReturns: { en: "Easy Returns", bn: "সহজ রিটার্ন" },
  returnsDesc: { en: "7-day return policy", bn: "৭ দিনের রিটার্ন সুবিধা" },

  // Newsletter
  newsletterTitle: { en: "Stay in the loop", bn: "আপডেট পেতে থাকুন" },
  newsletterDesc: { en: "Get notified about new arrivals and special offers", bn: "নতুন পণ্য ও অফারের খবর পান" },
  emailPlaceholder: { en: "your@email.com", bn: "your@email.com" },
  subscribe: { en: "Subscribe", bn: "সাবস্ক্রাইব" },

  // Footer
  allRights: { en: "All rights reserved.", bn: "সর্বস্বত্ব সংরক্ষিত।" },
  quickLinks: { en: "Quick Links", bn: "কুইক লিংক" },
  contactUs: { en: "Contact Us", bn: "যোগাযোগ" },
  followUs: { en: "Follow Us", bn: "ফলো করুন" },
  poweredBy: { en: "Agent-Native E-Commerce", bn: "এজেন্ট-নেটিভ ই-কমার্স" },

  // Owner panel
  ownerPanel: { en: "Owner Panel", bn: "মালিক প্যানেল" },
  ownerPhone: { en: "Phone Number", bn: "ফোন নম্বর" },
  ownerPin: { en: "PIN", bn: "পিন" },
  login: { en: "Login", bn: "লগইন" },
  loginError: { en: "Wrong phone or PIN", bn: "ভুল ফোন বা পিন" },
  logout: { en: "Logout", bn: "লগআউট" },
  dashboard: { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  newOrders: { en: "New Orders", bn: "নতুন অর্ডার" },
  addProduct: { en: "Add Product", bn: "পণ্য যোগ করুন" },
  newPost: { en: "New Post", bn: "নতুন পোস্ট" },
  shareSomething: { en: "Share something new", bn: "নতুন কিছু শেয়ার করুন" },
  postHelp: { en: "Add a photo, write a few words, and publish.", bn: "ছবি দিন, কয়েকটি কথা লিখুন, তারপর প্রকাশ করুন।" },
  addPhoto: { en: "Add a photo", bn: "ছবি যোগ করুন" },
  photoLinkHelp: { en: "Use a product photo link from your phone or social post.", bn: "আপনার ফোন বা সোশ্যাল পোস্টের প্রোডাক্ট ছবির লিংক দিন।" },
  photoLinkPlaceholder: { en: "Paste photo link here", bn: "ছবির লিংক এখানে দিন" },
  postPhotoAlt: { en: "Post preview", bn: "পোস্ট প্রিভিউ" },
  postTitle: { en: "What are you sharing?", bn: "কি শেয়ার করছেন?" },
  postTitlePlaceholder: { en: "e.g. Pink party frock", bn: "যেমন: পিংক পার্টি ফ্রক" },
  postCaption: { en: "Tell customers about it", bn: "কাস্টমারদের কিছু বলুন" },
  postCaptionPlaceholder: { en: "Write a friendly caption...", bn: "একটি সুন্দর ক্যাপশন লিখুন..." },
  postPrice: { en: "Price", bn: "মূল্য" },
  priceOnRequest: { en: "Price on request", bn: "মূল্য জানতে যোগাযোগ করুন" },
  showOnHome: { en: "Show this post on the homepage", bn: "হোমপেজে এই পোস্ট দেখান" },
  publishPost: { en: "Publish post", bn: "পোস্ট প্রকাশ করুন" },
  publishing: { en: "Publishing...", bn: "প্রকাশ হচ্ছে..." },
  postPublished: { en: "Your post is live!", bn: "আপনার পোস্ট প্রকাশিত হয়েছে!" },
  preview: { en: "Preview", bn: "প্রিভিউ" },
  justNow: { en: "Just now", bn: "এইমাত্র" },
  recentPosts: { en: "Recent posts", bn: "সাম্প্রতিক পোস্ট" },
  myProducts: { en: "My Products", bn: "আমার পণ্য" },
  todaysSales: { en: "Today's Sales", bn: "আজকের বিক্রি" },
  settings: { en: "Settings", bn: "সেটিংস" },
  backToShop: { en: "Back to Shop", bn: "শপে ফিরুন" },

  // Owner dashboard
  welcomeBack: { en: "Welcome back", bn: "স্বাগতম" },
  todayOrders: { en: "Today's Orders", bn: "আজকের অর্ডার" },
  todayRevenue: { en: "Today's Revenue", bn: "আজকের আয়" },
  pendingOrders: { en: "Pending Orders", bn: "অপেক্ষমাণ অর্ডার" },
  totalProducts: { en: "Total Products", bn: "মোট পণ্য" },
  recentOrders: { en: "Recent Orders", bn: "সাম্প্রতিক অর্ডার" },
  noOrdersYet: { en: "No orders yet", bn: "এখনো কোন অর্ডার নেই" },
  viewAllOrders: { en: "View All Orders", bn: "সব অর্ডার দেখুন" },

  // Manage orders
  allOrders: { en: "All Orders", bn: "সব অর্ডার" },
  confirm: { en: "Confirm", bn: "নিশ্চিত" },
  ship: { en: "Mark Shipped", bn: "প্রেরণ করুন" },
  deliver: { en: "Mark Delivered", bn: "ডেলিভার করুন" },
  cancel: { en: "Cancel", bn: "বাতিল" },
  callCustomer: { en: "Call Customer", bn: "কাস্টমারকে কল" },
  whatsappCustomer: { en: "WhatsApp", bn: "হোয়াটসঅ্যাপ" },
  paymentReceived: { en: "Payment Received", bn: "পেমেন্ট পাওয়া হয়েছে" },
  markPaid: { en: "Mark Paid", bn: "পরিশোধিত চিহ্নিত" },
  areYouSure: { en: "Are you sure?", bn: "আপনি কি নিশ্চিত?" },
  yes: { en: "Yes", bn: "হ্যাঁ" },
  no: { en: "No", bn: "না" },
  orderDetails: { en: "Order Details", bn: "অর্ডার বিস্তারিত" },
  customer: { en: "Customer", bn: "কাস্টমার" },
  payment: { en: "Payment", bn: "পেমেন্ট" },
  product: { en: "Product", bn: "পণ্য" },
  qty: { en: "Qty", bn: "পরিমাণ" },

  // Add/Edit product
  productName: { en: "Product Name", bn: "পণ্যের নাম" },
  productPrice: { en: "Price (Tk)", bn: "মূল্য (টাকা)" },
  comparePrice: { en: "Old Price (optional)", bn: "পুরোনো মূল্য (ঐচ্ছিক)" },
  selectCategory: { en: "Category", bn: "ক্যাটাগরি" },
  availableSizes: { en: "Available Sizes", bn: "উপলব্ধ সাইজ" },
  availableColors: { en: "Available Colors", bn: "উপলব্ধ রং" },
  stockQuantity: { en: "Stock Quantity", bn: "স্টক পরিমাণ" },
  productDescription: { en: "Description (optional)", bn: "বিবরণ (ঐচ্ছিক)" },
  productImages: { en: "Product Images", bn: "পণ্যের ছবি" },
  imageUrls: { en: "Image URLs (one per line)", bn: "ছবির লিংক (প্রতি লাইনে একটি)" },
  featured: { en: "Featured on homepage", bn: "হোমপেজে দেখান" },
  save: { en: "Save", bn: "সংরক্ষণ" },
  saving: { en: "Saving...", bn: "সংরক্ষণ হচ্ছে..." },
  edit: { en: "Edit", bn: "সম্পাদনা" },
  delete: { en: "Delete", bn: "মুছুন" },
  productSaved: { en: "Product saved!", bn: "পণ্য সংরক্ষিত!" },
  productDeleted: { en: "Product deleted", bn: "পণ্য মুছে ফেলা হয়েছে" },

  // Settings
  shopSettings: { en: "Shop Settings", bn: "শপ সেটিংস" },
  whatsappNumber: { en: "WhatsApp Number", bn: "হোয়াটসঅ্যাপ নম্বর" },
  bkashNumberSetting: { en: "bKash Number", bn: "বিকাশ নম্বর" },
  deliveryInside: { en: "Delivery Charge (Inside Dhaka)", bn: "ডেলিভারি চার্জ (ঢাকার ভিতরে)" },
  deliveryOutside: { en: "Delivery Charge (Outside Dhaka)", bn: "ডেলিভারি চার্জ (ঢাকার বাইরে)" },
  heroTitleSetting: { en: "Hero Title", bn: "হিরো শিরোনাম" },
  heroSubtitleSetting: { en: "Hero Subtitle", bn: "হিরো সাবটাইটেল" },
  saveSettings: { en: "Save Settings", bn: "সেটিংস সংরক্ষণ" },
  settingsSaved: { en: "Settings saved!", bn: "সেটিংস সংরক্ষিত!" },
  changePin: { en: "Change PIN", bn: "পিন পরিবর্তন" },
  newPin: { en: "New PIN", bn: "নতুন পিন" },

  // Misc
  loading: { en: "Loading...", bn: "লোড হচ্ছে..." },
  error: { en: "Something went wrong", bn: "কিছু ভুল হয়েছে" },
  retry: { en: "Retry", bn: "আবার চেষ্টা করুন" },
  currency: { en: "Tk", bn: "৳" },
  taka: { en: "Tk", bn: "৳" },
  noProducts: { en: "No products found", bn: "কোন পণ্য পাওয়া যায়নি" },
  noProductsInCategory: { en: "No products in this category yet", bn: "এই ক্যাটাগরিতে এখনো কোন পণ্য নেই" },
  filterBy: { en: "Filter", bn: "ফিল্টার" },
  sortBy: { en: "Sort", bn: "সাজান" },
  priceLowHigh: { en: "Price: Low to High", bn: "মূল্য: কম থেকে বেশি" },
  priceHighLow: { en: "Price: High to Low", bn: "মূল্য: বেশি থেকে কম" },
  newest: { en: "Newest First", bn: "নতুন প্রথম" },
  allSizes: { en: "All Sizes", bn: "সব সাইজ" },
  allColors: { en: "All Colors", bn: "সব রং" },
  clear: { en: "Clear", bn: "মুছুন" },
  results: { en: "results", bn: "ফলাফল" },
  off: { en: "OFF", bn: "ছাড়" },

  // Variant stock
  soldOut: { en: "Sold out", bn: "স্টক শেষ" },
  variantStock: { en: "Per-Variant Stock", bn: "ভ্যারিয়েন্ট স্টক" },
  trackVariantStock: { en: "Track stock per size/color", bn: "সাইজ/রং অনুযায়ী স্টক" },
  trackVariantStockHelp: { en: "Set a quantity for each combination. Total stock is the sum.", bn: "প্রতিটি কম্বিনেশনের পরিমাণ দিন। মোট স্টক হবে যোগফল।" },
  totalStock: { en: "Total stock", bn: "মোট স্টক" },
  combinationOutOfStock: { en: "This size/color combination is sold out", bn: "এই সাইজ/রং কম্বিনেশন শেষ" },
  selectCombination: { en: "Select a size and color", bn: "সাইজ ও রং নির্বাচন করুন" },

  // Image lightbox
  clickToZoom: { en: "Click to zoom", bn: "জুম করতে ক্লিক করুন" },
  closeViewer: { en: "Close viewer", bn: "ভিউয়ার বন্ধ করুন" },
  prevImage: { en: "Previous image", bn: "আগের ছবি" },
  nextImage: { en: "Next image", bn: "পরের ছবি" },
  zoomIn: { en: "Zoom in", bn: "জুম ইন" },
  zoomOut: { en: "Zoom out", bn: "জুম আউট" },

  // Reviews
  reviews: { en: "Reviews", bn: "রিভিউ" },
  basedOnReviews: { en: "Based on {n} reviews", bn: "{n}টি রিভিউয়ের ভিত্তিতে" },
  noReviewsYet: { en: "No reviews yet", bn: "এখনো কোনো রিভিউ নেই" },
  beFirstToReview: { en: "Be the first to review this product", bn: "প্রথম রিভিউ দিন" },
  writeReview: { en: "Write a review", bn: "রিভিউ লিখুন" },
  yourRating: { en: "Your rating", bn: "আপনার রেটিং" },
  reviewTitle: { en: "Review title (optional)", bn: "রিভিউ শিরোনাম (ঐচ্ছিক)" },
  yourReview: { en: "Your review", bn: "আপনার রিভিউ" },
  reviewPlaceholder: { en: "How was the quality, fit and fabric?", bn: "মান, ফিট ও কাপড় কেমন ছিল?" },
  reviewPhotos: { en: "Photo links (optional, one per line)", bn: "ছবির লিংক (ঐচ্ছিক, প্রতি লাইনে একটি)" },
  submitReview: { en: "Submit review", bn: "রিভিউ জমা দিন" },
  reviewSubmitted: { en: "Thank you! Your review is waiting for approval.", bn: "ধন্যবাদ! আপনার রিভিউ অনুমোদনের অপেক্ষায় আছে।" },
  verifiedPurchase: { en: "Verified purchase", bn: "যাচাইকৃত ক্রেতা" },
  pendingApproval: { en: "Pending approval", bn: "অনুমোদনের অপেক্ষায়" },
  yourName: { en: "Your name", bn: "আপনার নাম" },
  manageReviews: { en: "Reviews", bn: "রিভিউ" },
  pendingOnly: { en: "Pending only", bn: "শুধু অপেক্ষমাণ" },
  approve: { en: "Approve", bn: "অনুমোদন" },
  unapprove: { en: "Hide", bn: "লুকান" },
  markVerified: { en: "Verified", bn: "যাচাইকৃত" },
  noPendingReviews: { en: "No reviews to moderate", bn: "মডারেশনের জন্য কোনো রিভিউ নেই" },

  // Customer account
  myAccount: { en: "My Account", bn: "আমার অ্যাকাউন্ট" },
  accountLoginDesc: { en: "Save your details and see all your orders. No password needed — your phone number is your account.", bn: "আপনার তথ্য সংরক্ষণ করুন ও সব অর্ডার দেখুন। পাসওয়ার্ড লাগবে না — ফোন নম্বরই আপনার অ্যাকাউন্ট।" },
  accountSaved: { en: "Profile saved!", bn: "প্রোফাইল সংরক্ষিত!" },
  myOrders: { en: "My Orders", bn: "আমার অর্ডার" },
  noAccountOrders: { en: "You have no orders yet", bn: "আপনার এখনো কোনো অর্ডার নেই" },
  reorder: { en: "Buy again", bn: "আবার কিনুন" },
  reorderAdded: { en: "Items added to your cart", bn: "পণ্য কার্টে যোগ হয়েছে" },
  reorderPartial: { en: "Some items are no longer available", bn: "কিছু পণ্য আর পাওয়া যাচ্ছে না" },
  defaultAddress: { en: "Default delivery details", bn: "ডিফল্ট ডেলিভারি তথ্য" },
  switchAccount: { en: "Use a different phone number", bn: "অন্য নম্বর ব্যবহার করুন" },

  // Banners & announcement
  manageBanners: { en: "Banners", bn: "ব্যানার" },
  addBanner: { en: "Add Banner", bn: "ব্যানার যোগ করুন" },
  editBanner: { en: "Edit Banner", bn: "ব্যানার সম্পাদনা" },
  bannerTitle: { en: "Title", bn: "শিরোনাম" },
  bannerSubtitle: { en: "Subtitle", bn: "সাবটাইটেল" },
  bannerImage: { en: "Image URL", bn: "ছবির লিংক" },
  bannerLink: { en: "Link (optional)", bn: "লিংক (ঐচ্ছিক)" },
  bannerLinkHelp: { en: "Where the Shop Now button goes, e.g. /shop or /category?id=...", bn: "Shop Now বাটন কোথায় যাবে, যেমন /shop" },
  bannerActive: { en: "Show on homepage", bn: "হোমপেজে দেখান" },
  bannerSaved: { en: "Banner saved!", bn: "ব্যানার সংরক্ষিত!" },
  bannerDeleted: { en: "Banner deleted", bn: "ব্যানার মুছে ফেলা হয়েছে" },
  noBanners: { en: "No banners yet — the default hero will show", bn: "এখনো ব্যানার নেই — ডিফল্ট হিরো দেখাবে" },
  announcementBar: { en: "Announcement Bar", bn: "ঘোষণা বার" },
  announcementHelp: { en: "A slim notice shown above the header on every page.", bn: "প্রতিটি পেজে হেডারের উপরে একটি সরু নোটিশ।" },
  announcementEnabled: { en: "Show announcement bar", bn: "ঘোষণা বার দেখান" },
  dismissAnnouncement: { en: "Dismiss", bn: "বন্ধ করুন" },
}

type I18nContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem("ucp-locale")
    return stored === "bn" ? "bn" : "en"
  })

  const setLocale = (l: Locale) => {
    localStorage.setItem("ucp-locale", l)
    setLocaleState(l)
  }

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const entry = translations[key]
    if (!entry) return key
    let text = entry[locale] || entry.en
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  useEffect(() => {
    document.documentElement.lang = locale === "bn" ? "bn" : "en"
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
