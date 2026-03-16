export type AccessLocation = {
  name: string;
  type: string;
  city: string;
  services: string[];
};

export const accessLocations: AccessLocation[] = [
  {
    name: "Downtown Civic Center",
    type: "Public Civic Center",
    city: "Fort Collins",
    services: ["Identity verification", "Voting assistance", "Dispute support"]
  },
  {
    name: "North Library Kiosk",
    type: "Voting Kiosk",
    city: "Fort Collins",
    services: ["Proposal review", "Voting access"]
  },
  {
    name: "Community Payment Desk",
    type: "Payment Support",
    city: "Fort Collins",
    services: ["Need verification", "Appeals help", "Profile correction"]
  }
];