"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Save, Key, User, Bell } from "lucide-react";

export default function SettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email || "");
        setFullName(data.user.user_metadata?.full_name || "");
      }
      setLoading(false);
    });
  }, []);

  const handleUpdateProfile = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading text-lg">Settings</h1>
        <p className="mt-1 text-xs font-light text-muted-foreground">
          Manage your account and API configurations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="opacity-60" />
            </div>
            <Button onClick={handleUpdateProfile}>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" />
              API Keys
            </CardTitle>
            <CardDescription>
              Configure external data source API keys. These are stored as environment
              variables on your server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>RapidAPI Key (Zillow)</Label>
              <Input
                type="password"
                placeholder="••••••••"
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                Set via RAPIDAPI_KEY environment variable
              </p>
            </div>
            <div className="space-y-2">
              <Label>ATTOM Data API Key</Label>
              <Input
                type="password"
                placeholder="••••••••"
                disabled
              />
              <p className="text-[11px] text-muted-foreground">
                Set via ATTOM_API_KEY environment variable
              </p>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              API keys are configured through environment variables for security.
              Update them in your Vercel dashboard or .env.local file.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">New Properties Found</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when scraping finds new properties
                </p>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Deal Stage Changes</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when a deal moves stages
                </p>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Scrape Errors</p>
                <p className="text-xs text-muted-foreground">
                  Get notified when a scraping job fails
                </p>
              </div>
              <input type="checkbox" defaultChecked className="rounded" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Commission Configuration</CardTitle>
            <CardDescription>Your commission rates for deals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Acquisition Commission Rate</Label>
              <div className="flex items-center gap-2">
                <Input defaultValue="3" type="number" step="0.1" className="w-24" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Earned when the cash buyer acquires the property
              </p>
            </div>
            <div className="space-y-2">
              <Label>Listing Commission Rate</Label>
              <div className="flex items-center gap-2">
                <Input defaultValue="1" type="number" step="0.1" className="w-24" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Earned when you list the remodeled property
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
