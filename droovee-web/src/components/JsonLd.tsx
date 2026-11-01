import React from "react";

/**
 * Droovee Structured Data (JSON-LD) Components for Google Search & AI Engine (AEO/GEO)
 * Implements Schema.org standards for LocalBusiness, Organization, WebSite, Service, FAQ, and Breadcrumbs.
 */

export function OrganizationAndLocalBusinessJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://droovee.com/#organization",
        "name": "Droovee",
        "legalName": "Droovee Mobility",
        "url": "https://droovee.com",
        "logo": {
          "@type": "ImageObject",
          "@id": "https://droovee.com/#logo",
          "url": "https://droovee.com/logo.png",
          "contentUrl": "https://droovee.com/logo.png",
          "caption": "Droovee — Professional Chauffeur Services for Your Own Car",
        },
        "image": "https://droovee.com/launch-hero.jpg",
        "description":
          "Droovee is a professional on-demand driver booking service in Bhubaneswar, Odisha. Customers hire background-verified, police-checked professional chauffeurs to drive their personal cars for hourly city travel, outstation trips, airport transfers, and monthly commutes.",
        "telephone": "+91-8114994367",
        "email": "droovee.admin@gmail.com",
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "telephone": "+91-8114994367",
            "contactType": "customer service",
            "areaServed": "IN",
            "availableLanguage": ["English", "Hindi", "Odia"],
          },
        ],
        "sameAs": [
          "https://wa.me/918114994367",
        ],
      },
      {
        "@type": ["LocalBusiness", "ProfessionalService"],
        "@id": "https://droovee.com/#localbusiness",
        "name": "Droovee — Professional Driver Services in Bhubaneswar",
        "url": "https://droovee.com",
        "logo": "https://droovee.com/logo.png",
        "image": "https://droovee.com/launch-hero.jpg",
        "telephone": "+91-8114994367",
        "email": "droovee.admin@gmail.com",
        "priceRange": "₹₹",
        "currenciesAccepted": "INR",
        "paymentAccepted": "Cash, UPI, Credit Card, Debit Card",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Patia & Saheed Nagar",
          "addressLocality": "Bhubaneswar",
          "addressRegion": "Odisha",
          "postalCode": "751024",
          "addressCountry": "IN",
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "20.2961",
          "longitude": "85.8245",
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            "opens": "00:00",
            "closes": "23:59",
          },
        ],
        "areaServed": [
          {
            "@type": "City",
            "name": "Bhubaneswar",
          },
          {
            "@type": "City",
            "name": "Cuttack",
          },
          {
            "@type": "City",
            "name": "Puri",
          },
          {
            "@type": "AdministrativeArea",
            "name": "Odisha",
          },
        ],
        "knowsAbout": [
          "Driver for rent in Bhubaneswar",
          "Hire personal driver in Bhubaneswar",
          "Driver for my own car",
          "Hourly chauffeur service",
          "Outstation driver to Puri and Cuttack",
          "Biju Patnaik Airport driver transfer",
          "Monthly personal driver in Bhubaneswar",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://droovee.com/#website",
        "url": "https://droovee.com",
        "name": "Droovee",
        "description": "Book a professional, verified chauffeur for your own car in Bhubaneswar, Odisha.",
        "publisher": {
          "@id": "https://droovee.com/#organization",
        },
        "inLanguage": "en-IN",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FaqJsonLd({ faqs }: { faqs: { q: string; a: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ServiceJsonLd({
  name,
  description,
  url,
  serviceType,
}: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "serviceType": serviceType,
    "url": url,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Droovee",
      "telephone": "+91-8114994367",
      "url": "https://droovee.com",
    },
    "areaServed": {
      "@type": "City",
      "name": "Bhubaneswar",
    },
    "termsOfService": "https://droovee.com/terms",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
