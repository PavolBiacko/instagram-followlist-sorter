CREATE TABLE "account" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" uuid NOT NULL,
	"username" varchar(30) NOT NULL,
	"follows_me" boolean NOT NULL,
	"followed_by_me" boolean NOT NULL,
	"follows_me_since" timestamp with time zone,
	"followed_by_me_since" timestamp with time zone,
	"avatar_url" varchar(1024),
	CONSTRAINT "uq_account_workspace_username" UNIQUE("workspace_id","username")
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"group_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	CONSTRAINT "group_member_group_id_account_id_pk" PRIMARY KEY("group_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "account_group" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_group_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workspace_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"color" varchar(7) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_username" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_account_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."account_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_group" ADD CONSTRAINT "account_group_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_group_member_account" ON "group_member" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "ix_account_group_workspace" ON "account_group" USING btree ("workspace_id");