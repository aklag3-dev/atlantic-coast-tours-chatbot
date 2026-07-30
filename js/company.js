window.ACTCompany = {
  brand: {
    name: 'Atlantic Coast Tours',
    tagline: 'Wild Atlantic Way Experiences',
    version: '1.0'
  },

  contacts: {
    phone: '+353 86 229 3331',
    email: 'info@atlanticcoasttours.ie',
    address: 'Knockbeg, Collooney, Co. Sligo, F91 YA47, Ireland'
  },

  greetings: [
    "Hi, I'm the Atlantic Coast Tours assistant. I can help you find tours, check prices, and answer questions about booking. What are you looking for?",
    "Welcome! I'm here to help you explore the Wild Atlantic Way. Ask me about tours, prices, or anything else.",
    "Hi there — looking for a tour along Ireland's west coast? Tell me what you're interested in and I'll find the perfect trip for you."
  ],

  welcomeDisclaimer: "For accurate and current information, I fetch the latest tour details from our live database with every question.",

  categories: [
    {
      id: 'booking',
      title: 'Booking and reservations',
      keywords: [
        'book', 'booking', 'reserve', 'reservation', 'how to book',
        'group', 'group booking', 'private tour', 'private',
        'availability', 'available', 'slot', 'spaces',
        'online', 'website', 'phone booking', 'email booking',
        'gift voucher', 'voucher', 'gift card',
        'family', 'kids', 'children', 'all ages', 'suitable for',
        'large group', 'corporate', 'school'
      ],
      triggers: [
        /how.*(book|reserve)/i,
        /(book|reserve).*tour/i,
        /group.*(book|tour|size)/i,
        /private.*tour/i,
        /(gift|voucher|gift.*card)/i,
        /(available|slot|space).*tour/i,
        /how.*(many|much).*person/i,
        /suitable.*(kid|child|family)/i,
        /book.*online/i,
        /last.*minute/i
      ],
      response: "<p>You can book any of our tours directly through our website or by calling <strong>+353 86 229 3331</strong>. Most tours run with a minimum of 2 and can accommodate groups of up to our listed capacity.</p><p>Private tours are available for all experiences — just let us know your preferred date and group size and we will tailor the day to you. Gift vouchers are also available for any tour.</p>",
      followupChips: [
        'What tours are available for groups?',
        'Do you offer gift vouchers?',
        'How do I pay?',
        'Back to tours'
      ]
    },
    {
      id: 'payment',
      title: 'Payment and pricing',
      keywords: [
        'pay', 'payment', 'price', 'pricing', 'cost', 'costs',
        'euro', 'eur', 'euros', 'money', 'deposit',
        'card', 'credit card', 'debit card', 'cash',
        'refund', 'refundable', 'deposit',
        'discount', 'offer', 'special offer', 'deal',
        'student', 'senior', 'concession',
        'kids under 12', 'children discount', 'half price',
        'early bird', 'group discount',
        'worth', 'value', 'expensive', 'cheap'
      ],
      triggers: [
        /how much/i,
        /(price|cost).*tour/i,
        /(pay|payment).*(method|option|card|how)/i,
        /(refund|deposit|cancel).*(policy|fee)/i,
        /(discount|offer|deal|special)/i,
        /card.*(accept|pay)/i,
        /(student|senior|concession).*(price|discount)/i,
        /half.*price/i,
        /early.*bird/i,
        /group.*(discount|rate)/i
      ],
      response: "<p>We accept all major credit and debit cards. A <strong>50% deposit</strong> is required at the time of booking, with the balance due on the day of your tour.</p><p>Check individual tour pages for current special offers — we regularly run early-bird discounts, group deals, and seasonal promotions. Kids under 12 get half price on selected tours.</p>",
      followupChips: [
        'What special offers are available?',
        'What is the cancellation policy?',
        'Show me all tours',
        'Back to tours'
      ]
    },
    {
      id: 'cancellation',
      title: 'Cancellation and changes',
      keywords: [
        'cancel', 'cancellation', 'cancel', 'cancelled',
        'change', 'change date', 'reschedule', 'postpone',
        'refund', 'refundable', 'money back',
        'policy', 'terms', 'conditions',
        'weather', 'rain', 'storm', 'bad weather',
        'notice', 'advance notice',
        'miss', 'missed', 'late',
        'modify', 'modification'
      ],
      triggers: [
        /cancel.*tour|tour.*cancel/i,
        /cancellation.*(policy|fee)/i,
        /(refund|money.back).*(policy|cancel)/i,
        /(change|reschedule|postpone).*(date|booking|tour)/i,
        /weather.*(cancel|refund)/i,
        /(modify|change).*booking/i,
        /what.*(if).*(rain|weather)/i,
        /how.*(cancel|reschedule)/i,
        /last.*minute.*cancel/i
      ],
      response: "<p>You can cancel or reschedule up to <strong>48 hours before</strong> your tour for a full refund. Within 48 hours, cancellations are non-refundable but we will work with you to reschedule if possible.</p><p>In cases of extreme weather where we cancel the tour on our end, you receive a <strong>full refund</strong> or can transfer to another date. Contact us at <strong>+353 86 229 3331</strong> to make changes.</p>",
      followupChips: [
        'How do I contact you?',
        'What happens in bad weather?',
        'Show me all tours',
        'Back to tours'
      ]
    },
    {
      id: 'logistics',
      title: 'What to know before you go',
      keywords: [
        'meeting point', 'meet', 'meeting', 'where', 'location',
        'start', 'starting point', 'departure',
        'bring', 'wear', 'pack', 'need',
        'what to bring', 'what to wear',
        'accessibility', 'wheelchair', 'mobility',
        'duration', 'how long', 'hours',
        'difficulty', 'fitness', 'level', 'easy', 'moderate',
        'transport', 'parking', 'car park',
        'toilet', 'bathroom', 'facilities',
        'lunch', 'food', 'eat'
      ],
      triggers: [
        /where.*(meet|start|depart)/i,
        /meeting.*point/i,
        /what.*(bring|wear|pack|take)/i,
        /(how.*long).*tour/i,
        /(duration|hours).*tour/i,
        /(wheelchair|accessibility|mobility)/i,
        /(difficulty|fitness|level|easy|hard)/i,
        /(parking|car.*park|transport)/i,
        /what.*(included|include)/i,
        /(lunch|food|snack).*(included|provided)/i
      ],
      response: "<p>Meeting points vary by tour — each tour page lists the exact location. Most start at a central landmark, pier, or visitor centre. Parking is available at all meeting points.</p><p>We recommend wearing comfortable walking shoes and weather-appropriate clothing (this is the Wild Atlantic Way, after all). Bring water and a camera. All equipment needed for activities (kayaks, bikes, wetsuits, segways) is provided.</p>",
      followupChips: [
        'Where do the tours meet?',
        'What should I bring?',
        'Are tours accessible?',
        'Back to tours'
      ]
    },
    {
      id: 'general',
      title: 'General information',
      keywords: [
        'contact', 'phone', 'email', 'address',
        'hours', 'open', 'season', 'months',
        'about', 'company', 'who', 'team',
        'guide', 'tour guide', 'local guide',
        'language', 'english', 'irish',
        'safety', 'insurance', 'certified',
        'review', 'rating', 'tripadvisor',
        'wild atlantic way', 'west coast',
        'ireland', 'irish',
        'gift', 'gift voucher',
        'custom', 'tailor', 'bespoke',
        'recommend', 'recommendation', 'suggestion', 'best'
      ],
      triggers: [
        /(contact|phone|email|address).*you/i,
        /how.*(contact|reach|call)/i,
        /(hours|open|season|when).*(operate|open)/i,
        /about.*(company|you)/i,
        /who.*(guide|team|run)/i,
        /(language|english|irish).*(tour|guide)/i,
        /(safe|insurance|certified|licensed)/i,
        /(review|rating|tripadvisor)/i,
        /wild.*atlantic.*way/i,
        /(custom|tailor|bespoke).*tour/i,
        /(recommend|suggestion|best).*(tour|trip)/i
      ],
      response: "<p>Atlantic Coast Tours runs guided experiences along Ireland's <strong>Wild Atlantic Way</strong> — from the Cliffs of Moher to Connemara and Achill Island. We offer cliff walks, boat trips, kayaking, cycling, food tours, and outdoor activities.</p><p>All tours are led by <strong>local guides</strong> with deep knowledge of the landscape, history, and wildlife. We are fully insured and certified. You can reach us at <strong>+353 86 229 3331</strong> or <strong>info@atlanticcoasttours.ie</strong>.</p>",
      followupChips: [
        'What makes Atlantic Coast Tours different?',
        'How do I contact you?',
        'Show me all tours',
        'Back to tours'
      ]
    }
  ],

  tourQueryTriggers: [
    /\b(tour|tours|trip|trips|experience|activity|adventure)\b/i,
    /\b(see|show|list|find|looking|want|need|search)\b.*\b(tour)/i,
    /\b(what|which).*(tour|trip|activity|offer|available)\b/i,
    /\b(cliff|walk|hike|kayak|cycle|boat|food|surf|sail|horse|segway|photo|yoga)\b/i,
    /\b(galway|clare|mayo|sligo|doolin|connemara|achill|kilkee|westport|aran|inis|burren|clifden)\b/i,
    /\b(price|cost|how much|cheap|expensive|discount|offer|special)\b/i,
    /\b(today|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|next week)\b/i,
    /\b(duration|hour|how long|morning|afternoon|full day|half day)\b/i,
    /\b(available|slot|space|open|booked)\b/i
  ],

  starterChips: [
    'What tours do you offer?',
    'How much is the Cliffs of Moher walk?',
    'Do you have any food tours?',
    'What is available in Galway?',
    'What is your cancellation policy?'
  ],

  outOfScopeFallback: {
    response: "<p>I'm not sure about that one. For any questions not covered here, please call us on <strong>+353 86 229 3331</strong> or email <strong>info@atlanticcoasttours.ie</strong> and we will be happy to help.</p>",
    followupChips: [
      'Call us',
      'Send an email',
      'Show me all tours',
      'Back to tours'
    ]
  },

  scopeNotice: {
    title: "Beyond my tour knowledge",
    body: "Please note that my role is primarily to answer questions about Atlantic Coast Tour packages. Non-tour related answers cannot be guaranteed by Atlantic Coast Tours."
  }
};
