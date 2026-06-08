CREATE TABLE "game_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"duration_seconds" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"difficulty" varchar(50) NOT NULL,
	"rating" real NOT NULL,
	"plays" integer DEFAULT 0 NOT NULL,
	"thumbnail_url" text,
	"iframe_url" text,
	"controls_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rules_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_games" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"game_id" integer NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_analytics" ADD CONSTRAINT "game_analytics_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;