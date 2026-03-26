/**
 * Section 3: Services Ecosystem
 * Grid of service cards with lifestyle images.
 * Transforms abstract promise into concrete desire through specificity.
 * Color: Gold accent on warm dark, glass-morphism cards with images.
 */

import { motion } from "framer-motion";
import {
  Shirt,
  Dog,
  Car,
  Wrench,
  SprayCan,
  Package,
  Sparkles,
  MessageCircle,
  Gem,
} from "lucide-react";

const services = [
  {
    icon: Shirt,
    name: "Laundry Pickup",
    desc: "Wash, fold, and deliver back to your door",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-laundry-N4bB8Qf9Ne8TuBAJ6g5TP5.webp",
  },
  {
    icon: Gem,
    name: "Dry Cleaning",
    desc: "Professional garment care, picked up and returned",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-drycleaning-M27NVgs4vLcGZNG536ww9v.webp",
  },
  {
    icon: Dog,
    name: "Dog Grooming",
    desc: "Mobile grooming brought to your unit",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-doggrooming-RxBYTJ5X8yrMq4gqsT9bay.webp",
  },
  {
    icon: Car,
    name: "Car Detailing",
    desc: "Full detail in your parking spot",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-cardetail-geRFrP7N66PGFaL4Wb3bgu.webp",
  },
  {
    icon: SprayCan,
    name: "Cleaning Services",
    desc: "Deep clean or recurring home cleaning",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-cleaning-K9RLH2HvomqaZ5qtF4Q2vU.webp",
  },
  {
    icon: Wrench,
    name: "Handyman",
    desc: "Repairs, fixes, and maintenance on demand",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-handyman-V9gFsp7JunHTsRpvm9Sqje.webp",
  },
  {
    icon: Package,
    name: "Assembly",
    desc: "Furniture and equipment built and installed",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-assembly-F4a25dYh37Swqpmwitb83Y.webp",
  },
  {
    icon: MessageCircle,
    name: "Just Ask",
    desc: "Any service you need — we'll find the vendor",
    img: "https://d2xsxph8kpxj0f.cloudfront.net/310419663029845795/6mwyUrDqukxWVNyNuZKvJ6/service-justask-bVEvzP3ChY6jqzfGzK3RBB.webp",
    isOpen: true,
  },
];

export default function ServicesEcosystem() {
  return (
    <section id="services" className="relative py-24 lg:py-32">
      {/* Subtle top border */}
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 lg:mb-20"
        >
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)", color: "#FAF8F5" }}
          >
            Everything beyond your door,{" "}
            <span className="text-gradient-gold">delivered.</span>
          </h2>
          <p
            className="text-lg max-w-xl"
            style={{ color: "rgba(250,248,245,0.5)" }}
          >
            Stop searching, scheduling, and coordinating. Just text what you need. Our AI handles the logistics with vetted, in-building vendors — turning any outside service into a native amenity.
          </p>
        </motion.div>

        {/* Service grid — full catalog; zip used 4 cards only */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 max-w-4xl mx-auto">
          {services.map((service, i) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
            >
              <div
                className={`relative rounded-2xl overflow-hidden h-full transition-all duration-300 group cursor-default
                  ${service.isOpen
                    ? "ring-1 ring-brand-gold/25"
                    : ""
                  }`}
              >
                {/* Background image */}
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={service.img}
                    alt={service.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Gradient overlay — heavy at bottom for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                  {/* Extra bottom darkening */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

                  {/* Content positioned at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300
                        ${service.isOpen
                          ? "bg-brand-gold/20 backdrop-blur-sm"
                          : "bg-white/10 backdrop-blur-sm group-hover:bg-brand-gold/15"
                        }`}
                    >
                      {service.isOpen ? (
                        <Sparkles className="w-4.5 h-4.5 text-brand-gold" strokeWidth={1.5} />
                      ) : (
                        <service.icon
                          className="w-4.5 h-4.5 text-white/80 group-hover:text-brand-gold transition-colors duration-300"
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                    <h3
                      className={`text-sm font-semibold mb-1 transition-colors duration-300
                        ${service.isOpen ? "text-brand-gold" : "text-white group-hover:text-white"}`}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {service.name}
                    </h3>
                    <p
                      className="text-xs leading-relaxed text-white/50"
                    >
                      {service.desc}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
