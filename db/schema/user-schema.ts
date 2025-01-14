export interface UserSchema {
  id: string
  email: string
  name?: string
  createdAt: string
  updatedAt: string
  googleCalendar?: {
    connected: boolean
    tokens: {
      access_token: string
      refresh_token: string
      scope: string
      token_type: string
      expiry_date: number
    }
    webhook?: {
      channelId: string
      resourceId: string
      expiration: string
    }
  }
} 