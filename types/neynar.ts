export interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verified_addresses: {
    eth_addresses: string[];
    sol_addresses: string[];
  };
  profile: {
    bio: {
      text: string;
    };
  };
  follower_count: number;
  following_count: number;
  power_badge: boolean;
}

export interface SearchUsersResponse {
  result: {
    users: NeynarUser[];
  };
}

export interface UserBulkResponse {
  users: NeynarUser[];
}
