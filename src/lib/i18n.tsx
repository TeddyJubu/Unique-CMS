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
  newPost: { en: "Add Product", bn: "পণ্য যোগ করুন" },
  shareSomething: { en: "Share something new", bn: "নতুন কিছু শেয়ার করুন" },
  postHelp: { en: "Choose photos, add the details, and review before publishing.", bn: "ছবি বাছুন, তথ্য দিন, তারপর দেখে প্রকাশ করুন।" },
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
  stockQuantity: { en: "How many do you have?", bn: "আপনার কাছে কতটি আছে?" },
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
  heroTitleSetting: { en: "Main homepage heading", bn: "হোমপেজের প্রধান শিরোনাম" },
  heroSubtitleSetting: { en: "Short message below the heading", bn: "শিরোনামের নিচে ছোট বার্তা" },
  saveSettings: { en: "Save Settings", bn: "সেটিংস সংরক্ষণ" },
  settingsSaved: { en: "Settings saved!", bn: "সেটিংস সংরক্ষিত!" },
  changePin: { en: "Change PIN", bn: "পিন পরিবর্তন" },
  newPin: { en: "New PIN", bn: "নতুন পিন" },

  // Misc
  loading: { en: "Loading...", bn: "লোড হচ্ছে..." },
  error: { en: "We couldn't finish that. Check your connection and try again.", bn: "কাজটি শেষ হয়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।" },
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
  manageBanners: { en: "Homepage pictures", bn: "হোমপেজের ছবি" },
  addBanner: { en: "Add homepage picture", bn: "হোমপেজে ছবি যোগ করুন" },
  editBanner: { en: "Edit homepage picture", bn: "হোমপেজের ছবি বদলান" },
  bannerTitle: { en: "Title", bn: "শিরোনাম" },
  bannerSubtitle: { en: "Subtitle", bn: "সাবটাইটেল" },
  bannerImage: { en: "Homepage picture", bn: "হোমপেজের ছবি" },
  bannerLink: { en: "Link (optional)", bn: "লিংক (ঐচ্ছিক)" },
  bannerLinkHelp: { en: "Where the Shop Now button goes, e.g. /shop or /category?id=...", bn: "Shop Now বাটন কোথায় যাবে, যেমন /shop" },
  bannerActive: { en: "Show on homepage", bn: "হোমপেজে দেখান" },
  bannerSaved: { en: "Banner saved!", bn: "ব্যানার সংরক্ষিত!" },
  bannerDeleted: { en: "Banner deleted", bn: "ব্যানার মুছে ফেলা হয়েছে" },
  noBanners: { en: "No homepage pictures yet. Your shop's default picture will show.", bn: "হোমপেজের ছবি নেই। দোকানের আগের ছবিটি দেখাবে।" },
  announcementBar: { en: "Announcement Bar", bn: "ঘোষণা বার" },
  announcementHelp: { en: "A slim notice shown above the header on every page.", bn: "প্রতিটি পেজে হেডারের উপরে একটি সরু নোটিশ।" },
  announcementEnabled: { en: "Show announcement bar", bn: "ঘোষণা বার দেখান" },
  dismissAnnouncement: { en: "Dismiss", bn: "বন্ধ করুন" },

  manageShop: { en: "Manage my shop", bn: "আমার দোকান পরিচালনা" },
  stock: { en: "Available quantity", bn: "বিক্রির জন্য আছে" },
  moreShopTools: { en: "More", bn: "আরও" },
  noCategory: { en: "Choose a category (optional)", bn: "ধরন বাছুন (ঐচ্ছিক)" },
  productNameRequired: { en: "Give your product a name so customers can find it.", bn: "কাস্টমারকে পণ্য চিনতে একটি নাম দিন।" },
  shopName: { en: "Shop name", bn: "দোকানের নাম" },
  choosePhotos: { en: "Choose photos from your phone or computer", bn: "ফোন বা কম্পিউটার থেকে ছবি বাছুন" },
  choosePhotosHelp: { en: "Choose your product photos. The first photo is shown in the shop.", bn: "পণ্যের ছবি বাছুন। প্রথম ছবিটি দোকানে দেখাবে।" },
  chooseBannerPhotoHelp: { en: "Choose a picture for the top of your homepage.", bn: "হোমপেজের উপরের অংশে দেখানোর জন্য একটি ছবি বাছুন।" },
  settingsLoadError: { en: "We couldn't load your shop settings. Try again before making changes.", bn: "দোকানের সেটিংস আনা যায়নি। পরিবর্তন করার আগে আবার চেষ্টা করুন।" },
  photoPrivacyHelp: { en: "Photos upload automatically. Review your product before publishing it.", bn: "ছবি নিজে থেকেই আপলোড হবে। প্রকাশের আগে পণ্যটি দেখে নিন।" },
  uploadingPhotos: { en: "Uploading photos…", bn: "ছবি আপলোড হচ্ছে…" },
  uploadingPhotosHelp: { en: "Please wait for your photos to finish uploading before continuing.", bn: "এগোনোর আগে ছবি আপলোড শেষ হওয়া পর্যন্ত অপেক্ষা করুন।" },
  removePhoto: { en: "Remove photo", bn: "ছবি সরান" },
  coverPhoto: { en: "Main photo", bn: "প্রধান ছবি" },
  makeCoverPhoto: { en: "Use as main photo", bn: "প্রধান ছবি করুন" },
  usePhotoLink: { en: "Already have a photo link?", bn: "আগেই ছবির লিংক আছে?" },
  addPhotoLink: { en: "Add this photo", bn: "এই ছবি যোগ করুন" },
  photoLimit: { en: "You can add up to {count} photos. Remove one before adding more.", bn: "সর্বোচ্চ {count}টি ছবি যোগ করা যাবে। আরও যোগ করতে একটি সরান।" },
  photoTooLarge: { en: "That photo is over 20 MB. Choose a smaller photo and try again.", bn: "ছবিটি ২০ MB-এর বেশি। ছোট ছবি বেছে আবার চেষ্টা করুন।" },
  photoFormatError: { en: "We couldn't open that photo. Choose a JPG, PNG, WebP or another photo from your gallery.", bn: "ছবিটি খোলা যায়নি। গ্যালারি থেকে JPG, PNG, WebP বা অন্য ছবি বাছুন।" },
  photoUploadError: { en: "That photo didn't finish uploading. Photos already shown here are kept. Check your connection and choose the missing photo again.", bn: "ছবিটি আপলোড শেষ হয়নি। এখানে দেখানো ছবিগুলো আছে। সংযোগ দেখে বাদ পড়া ছবিটি আবার বাছুন।" },
  photoLinkError: { en: "Paste the full photo link, starting with https://.", bn: "https:// দিয়ে শুরু হওয়া পুরো ছবির লিংক দিন।" },
  ownerSessionError: { en: "Your shop login is no longer working. Open Manage my shop and sign in again before trying this action.", bn: "দোকানের লগইন কাজ করছে না। আমার দোকান পরিচালনা থেকে আবার লগইন করে চেষ্টা করুন।" },
  keepUnchanged: { en: "Keep unchanged", bn: "আগের মতো রাখুন" },
  productLoadError: { en: "We couldn't load your products. Check your connection and try again.", bn: "পণ্যগুলো আনা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।" },
  productSaveError: { en: "We couldn't confirm the product was saved. Your details are kept here. Check My Products before retrying so you don't add it twice.", bn: "পণ্য সংরক্ষণ নিশ্চিত করা যায়নি। তথ্য এখানে আছে। আবার চেষ্টা করার আগে আমার পণ্য দেখে নিন, যাতে দুইবার যোগ না হয়।" },
  productDeleteError: { en: "We couldn't confirm the product was removed. Check My Products before trying again.", bn: "পণ্য সরানো নিশ্চিত করা যায়নি। আবার চেষ্টা করার আগে আমার পণ্য দেখে নিন।" },
  removeProductTitle: { en: "Remove {name} from your shop?", bn: "দোকান থেকে {name} সরাবেন?" },
  removeProductHelp: { en: "Customers will no longer see or buy this product. Existing orders stay in your order list.", bn: "কাস্টমাররা এই পণ্য আর দেখতে বা কিনতে পারবেন না। আগের অর্ডারগুলো তালিকায় থাকবে।" },
  removeProduct: { en: "Remove product", bn: "পণ্য সরান" },
  productBasics: { en: "Tell customers about your product", bn: "কাস্টমারকে পণ্যের কথা বলুন" },
  productFormHelp: { en: "Add photos and the details below. You'll see a preview before it goes into your shop.", bn: "ছবি ও নিচের তথ্য দিন। দোকানে দেওয়ার আগে দেখে নিতে পারবেন।" },
  quantityHelp: { en: "Enter the number you can sell. Enter 0 if it is sold out.", bn: "বিক্রির জন্য কতটি আছে লিখুন। শেষ হয়ে গেলে ০ লিখুন।" },
  contactForPrice: { en: "Customers should contact me for the price", bn: "দাম জানতে কাস্টমার আমার সাথে যোগাযোগ করবে" },
  productOptions: { en: "Sizes and colours (optional)", bn: "সাইজ ও রং (ঐচ্ছিক)" },
  productOptionsHelp: { en: "Select only the sizes and colours you actually sell. Leave blank if they don't apply.", bn: "শুধু আপনার কাছে থাকা সাইজ ও রং বাছুন। প্রযোজ্য না হলে খালি রাখুন।" },
  extraProductDetails: { en: "More details (optional)", bn: "আরও তথ্য (ঐচ্ছিক)" },
  bengaliName: { en: "Product name in Bangla (optional)", bn: "পণ্যের বাংলা নাম (ঐচ্ছিক)" },
  bengaliDescription: { en: "Description in Bangla (optional)", bn: "বাংলা বিবরণ (ঐচ্ছিক)" },
  reviewProduct: { en: "Review my product", bn: "পণ্যটি দেখে নিই" },
  reviewProductHelp: { en: "Check the photos, price and quantity. Publish only when they are correct.", bn: "ছবি, দাম ও পরিমাণ দেখুন। সঠিক হলে প্রকাশ করুন।" },
  publishProduct: { en: "Publish product", bn: "পণ্য প্রকাশ করুন" },
  saveProductChanges: { en: "Save product changes", bn: "পণ্যের পরিবর্তন সংরক্ষণ" },
  continueEditing: { en: "Go back and edit", bn: "ফিরে গিয়ে ঠিক করুন" },
  productPhotoRequired: { en: "Add at least one photo so customers can see what you are selling.", bn: "কাস্টমারকে পণ্য দেখাতে অন্তত একটি ছবি দিন।" },
  productQuantityRequired: { en: "Enter how many you have, or enter 0 if it is sold out.", bn: "কতটি আছে লিখুন, অথবা শেষ হয়ে গেলে ০ লিখুন।" },
  variantQuantityRequired: { en: "Enter a quantity for each selected size and colour. Use 0 for combinations you don't have.", bn: "প্রতিটি বাছাই করা সাইজ ও রংয়ের পরিমাণ দিন। যে জোড়াটি নেই সেখানে ০ দিন।" },
  productPriceRequired: { en: "Enter a price greater than 0, or choose contact me for the price.", bn: "০-এর বেশি দাম দিন, অথবা দাম জানতে যোগাযোগের অপশন বাছুন।" },
  ordersLoadError: { en: "We couldn't load your orders. This doesn't mean there are no orders. Check your connection and try again.", bn: "অর্ডার আনা যায়নি। এর মানে অর্ডার নেই নয়। সংযোগ দেখে আবার চেষ্টা করুন।" },
  orderUpdateError: { en: "We couldn't confirm the change. Check this order's latest status before trying again.", bn: "পরিবর্তন নিশ্চিত করা যায়নি। আবার চেষ্টা করার আগে অর্ডারের বর্তমান অবস্থা দেখুন।" },
  orderConfirmHelp: { en: "Confirm only after checking the details with the customer. This does not book a delivery.", bn: "কাস্টমারের সাথে তথ্য মিলিয়ে নিশ্চিত করুন। এতে ডেলিভারি বুক হবে না।" },
  orderShipHelp: { en: "Mark shipped only after handing the parcel to your delivery service. This records the step; it does not send the parcel for you.", bn: "ডেলিভারি সার্ভিসকে পার্সেল দেওয়ার পর চিহ্নিত করুন। এতে শুধু তথ্য বদলায়, পার্সেল নিজে থেকে পাঠানো হয় না।" },
  orderDeliverHelp: { en: "Mark delivered only when the customer has received the parcel. Payment is recorded separately.", bn: "কাস্টমার পার্সেল পাওয়ার পর চিহ্নিত করুন। টাকা পাওয়ার তথ্য আলাদাভাবে রাখুন।" },
  orderCancelHelp: { en: "This marks the order as cancelled. It does not refund money or notify the delivery service.", bn: "অর্ডারটি বাতিল হিসেবে চিহ্নিত হবে। টাকা ফেরত বা ডেলিভারি সার্ভিসকে জানানো হবে না।" },
  orderPaidHelp: { en: "Check your bKash account first. This records money already received; it does not collect a payment.", bn: "আগে বিকাশ অ্যাকাউন্ট দেখুন। পাওয়া টাকার তথ্য রাখা হবে, টাকা সংগ্রহ করা হবে না।" },
  settingsSaveError: { en: "We couldn't confirm your settings were saved. Your entries are kept here. Check your shop before retrying.", bn: "সেটিংস সংরক্ষণ নিশ্চিত করা যায়নি। তথ্য এখানে আছে। আবার চেষ্টা করার আগে দোকান দেখে নিন।" },
  reviewsLoadError: { en: "We couldn't load the reviews. Check your connection and try again.", bn: "রিভিউ আনা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।" },
  reviewUpdateError: { en: "We couldn't confirm the review was changed. Reload the reviews to check before retrying.", bn: "রিভিউ পরিবর্তন নিশ্চিত করা যায়নি। আবার চেষ্টা করার আগে রিভিউ নতুন করে দেখুন।" },
  removeReviewTitle: { en: "Delete the review from {name}?", bn: "{name}-এর রিভিউ মুছবেন?" },
  removeReviewHelp: { en: "This review will be removed permanently. You cannot bring it back with this screen.", bn: "রিভিউটি স্থায়ীভাবে মুছবে। এই পেজ থেকে ফেরানো যাবে না।" },
  bannersLoadError: { en: "We couldn't load the homepage pictures. Check your connection and try again.", bn: "হোমপেজের ছবি আনা যায়নি। সংযোগ দেখে আবার চেষ্টা করুন।" },
  bannerSaveError: { en: "We couldn't confirm the homepage picture was saved. Your entries are kept. Reload the list before retrying.", bn: "হোমপেজের ছবি সংরক্ষণ নিশ্চিত করা যায়নি। তথ্য আছে। আবার চেষ্টা করার আগে তালিকা নতুন করে দেখুন।" },
  bannerDeleteError: { en: "We couldn't confirm the picture was removed. Reload the list before trying again.", bn: "ছবি সরানো নিশ্চিত করা যায়নি। আবার চেষ্টা করার আগে তালিকা নতুন করে দেখুন।" },
  removeBannerTitle: { en: "Remove {name} from the homepage?", bn: "হোমপেজ থেকে {name} সরাবেন?" },
  removeBannerHelp: { en: "This homepage picture will be deleted. Your products and their photos will stay unchanged.", bn: "হোমপেজের এই ছবিটি মুছবে। পণ্য ও পণ্যের ছবি আগের মতো থাকবে।" },
  loginConnectionError: { en: "We couldn't reach your shop. Check your internet connection and try signing in again.", bn: "দোকানের সাথে সংযোগ হয়নি। ইন্টারনেট দেখে আবার লগইন করুন।" },
  loginHelp: { en: "Use the shop owner's phone number and PIN to manage products and orders.", bn: "পণ্য ও অর্ডার পরিচালনার জন্য দোকানের মালিকের ফোন নম্বর ও পিন দিন।" },
  aiServiceAddress: { en: "AI service web address (API URL)", bn: "এআই সেবার ওয়েব ঠিকানা (API URL)" },
  aiServiceAddressHelp: { en: "Paste the connection address given by your AI provider. Use the base address, without /chat/completions at the end.", bn: "এআই সেবাদাতার দেওয়া সংযোগ ঠিকানা দিন। শেষে /chat/completions ছাড়া মূল ঠিকানা ব্যবহার করুন।" },
  aiConnectionKey: { en: "Private AI connection key (API key)", bn: "এআই সংযোগের গোপন চাবি (API key)" },
  aiConnectionKeyHelp: { en: "Copy this key from your AI provider. It connects your assistant to that service. Leave blank to keep your saved key.", bn: "এআই সেবাদাতার কাছ থেকে চাবিটি কপি করুন। এটি সহকারীকে সেই সেবায় যুক্ত করে। আগের চাবি রাখতে খালি রাখুন।" },
  aiModelName: { en: "AI model name", bn: "এআই মডেলের নাম" },
  aiModelNameHelp: { en: "Enter the model name supplied by your AI provider, for example gpt-4o-mini.", bn: "এআই সেবাদাতার দেওয়া মডেলের নাম লিখুন, যেমন gpt-4o-mini।" },
  aiConnectionHelp: { en: "Enter the connection details from your AI provider to turn on your shop assistant. All three fields are needed.", bn: "দোকানের সহকারী চালু করতে এআই সেবাদাতার সংযোগ তথ্য দিন। তিনটি ঘরই পূরণ করতে হবে।" },
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
