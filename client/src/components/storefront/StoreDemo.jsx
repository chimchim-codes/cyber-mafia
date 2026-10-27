import React from 'react';
import { ShoppingBag, Truck, ShieldCheck, RefreshCw, Star, MessageSquare, ArrowRight, ExternalLink } from 'lucide-react';

const FEATURED_PRODUCTS = [
  {
    id: 1,
    title: 'Nova Pro Noise-Cancelling Headphones',
    price: '$249.00',
    category: 'Audio',
    rating: 4.9,
    reviews: 1420,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    tag: 'Best Seller',
  },
  {
    id: 2,
    title: 'AeroStream Ultra Mechanical Keyboard',
    price: '$129.00',
    category: 'Peripherals',
    rating: 4.8,
    reviews: 890,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    tag: 'New Arrival',
  },
  {
    id: 3,
    title: 'Horizon Ergonomic 4K Monitor Arm',
    price: '$89.00',
    category: 'Workspace',
    rating: 4.7,
    reviews: 640,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500',
    tag: 'Popular',
  },
];

export default function StoreDemo() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white py-2 px-4 text-center text-xs font-medium">
        <span>🎉 Free 2-Day Priority Shipping on all orders over $50 | 24/7 AI-Powered Support Live</span>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified SupportHub Guarantee
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Premium Tech Crafted for Modern Creators.
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Explore award-winning audio, ergonomic workspace gear, and precision peripherals with 30-day risk-free returns and instantaneous AI customer assistance.
              </p>

              {/* Sample Order Tracking Card */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-xs space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    Recent Demo Order: <span className="font-mono text-blue-700">#ORD-8821</span>
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium text-[11px]">
                    In Transit
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Estimated delivery: <strong>Tomorrow by 3:00 PM</strong> via DHL Express. Need to update delivery notes? Click the bottom-right chat widget!
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 aspect-4/3">
                <img
                  src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800"
                  alt="Modern Smart Gear"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-6">
                  <div className="text-white space-y-1">
                    <p className="text-xs uppercase tracking-wider text-blue-300 font-semibold">Support Experience</p>
                    <h3 className="text-lg font-bold">Real-Time AI Assistant Ready 24/7</h3>
                    <p className="text-xs text-slate-200">
                      Click the floating chat bubble on the bottom right to track orders, ask return questions, or connect with a human agent!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
            <Truck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Fast Express Delivery</h4>
              <p className="text-[11px] text-slate-500">3-5 business days standard</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">30-Day Free Returns</h4>
              <p className="text-[11px] text-slate-500">Instant prepaid QR labels</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Secure Payments</h4>
              <p className="text-[11px] text-slate-500">256-bit encrypted checkout</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Instant AI & Agent Chat</h4>
              <p className="text-[11px] text-slate-500">Human escalation on demand</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Featured Customer Favorites</h2>
            <p className="text-xs text-slate-500">Simulate inquiries about shipping, pricing, or warranty</p>
          </div>
          <span className="text-xs font-medium text-blue-600 flex items-center gap-1 cursor-pointer hover:underline">
            View Catalog <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {FEATURED_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
            >
              <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {prod.tag}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-700">{prod.rating}</span>
                    <span className="text-[11px] text-slate-400">({prod.reviews} reviews)</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                    {prod.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{prod.category}</p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-base font-extrabold text-slate-900">{prod.price}</span>
                  <button className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
