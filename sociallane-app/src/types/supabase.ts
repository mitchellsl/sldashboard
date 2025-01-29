export interface Database {
  public: {
    Tables: {
      websites: {
        Row: {
          id: string;
          name: string;
          url: string;
          hosting_details: {
            host: string;
            username: string;
            password: string;
            port: string;
          } | null;
          database_details: {
            host: string;
            databaseName: string;
            databaseUser: string;
            password: string;
          } | null;
          status: string;
          created_at?: string;
          // ... any other columns you have
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          hosting_details?: {
            host: string;
            username: string;
            password: string;
            port: string;
          } | null;
          database_details?: {
            host: string;
            databaseName: string;
            databaseUser: string;
            password: string;
          } | null;
          status: string;
          created_at?: string;
          // ... other columns
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          hosting_details?: {
            host: string;
            username: string;
            password: string;
            port: string;
          } | null;
          database_details?: {
            host: string;
            databaseName: string;
            databaseUser: string;
            password: string;
          } | null;
          status?: string;
          created_at?: string;
          // ... other columns
        };
      };
    };
  };
} 