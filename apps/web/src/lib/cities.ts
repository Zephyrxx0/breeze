/**
 * Static place labels + coordinates for the India overview map and shortcut chips.
 * These are *places*, not data: every PM2.5 number shown for them is fetched live.
 */
export interface City {
  id: string;
  /** Short label used on chips and the map */
  short: string;
  /** Label passed in the deep link (`n=`), matches geocoder style "Name, State" */
  name: string;
  lat: number;
  lon: number;
}

export const CITIES: readonly City[] = [
  { id: "delhi", short: "Delhi", name: "New Delhi, Delhi", lat: 28.61, lon: 77.21 },
  { id: "mumbai", short: "Mumbai", name: "Mumbai, Maharashtra", lat: 19.08, lon: 72.88 },
  { id: "bengaluru", short: "Bengaluru", name: "Bengaluru, Karnataka", lat: 12.97, lon: 77.59 },
  { id: "kolkata", short: "Kolkata", name: "Kolkata, West Bengal", lat: 22.57, lon: 88.36 },
  { id: "chennai", short: "Chennai", name: "Chennai, Tamil Nadu", lat: 13.08, lon: 80.27 },
  { id: "hyderabad", short: "Hyderabad", name: "Hyderabad, Telangana", lat: 17.39, lon: 78.49 },
  { id: "pune", short: "Pune", name: "Pune, Maharashtra", lat: 18.52, lon: 73.86 },
  { id: "ahmedabad", short: "Ahmedabad", name: "Ahmedabad, Gujarat", lat: 23.02, lon: 72.57 },
  { id: "jaipur", short: "Jaipur", name: "Jaipur, Rajasthan", lat: 26.91, lon: 75.79 },
  { id: "lucknow", short: "Lucknow", name: "Lucknow, Uttar Pradesh", lat: 26.85, lon: 80.95 },
  { id: "patna", short: "Patna", name: "Patna, Bihar", lat: 25.59, lon: 85.14 },
  { id: "bhopal", short: "Bhopal", name: "Bhopal, Madhya Pradesh", lat: 23.26, lon: 77.41 },
  { id: "chandigarh", short: "Chandigarh", name: "Chandigarh, Chandigarh", lat: 30.73, lon: 76.78 },
  { id: "guwahati", short: "Guwahati", name: "Guwahati, Assam", lat: 26.14, lon: 91.74 },
  { id: "kochi", short: "Kochi", name: "Kochi, Kerala", lat: 9.93, lon: 76.27 },
  { id: "bhubaneswar", short: "Bhubaneswar", name: "Bhubaneswar, Odisha", lat: 20.3, lon: 85.82 },
  { id: "nagpur", short: "Nagpur", name: "Nagpur, Maharashtra", lat: 21.15, lon: 79.09 },
  { id: "ranchi", short: "Ranchi", name: "Ranchi, Jharkhand", lat: 23.34, lon: 85.31 },
  { id: "dehradun", short: "Dehradun", name: "Dehradun, Uttarakhand", lat: 30.32, lon: 78.03 },
  { id: "srinagar", short: "Srinagar", name: "Srinagar, Jammu and Kashmir", lat: 34.08, lon: 74.8 },
];

/** Shortcut chips for the empty state (plain labels — PRD §14) */
export const POPULAR_CITY_IDS = ["delhi", "mumbai", "bengaluru", "kolkata", "chennai", "hyderabad", "pune", "lucknow"];
