import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/data/blog-posts";
import { getBlogCover } from "@/data/blog-covers";

const tagStyles: Record<string, string> = {
  "Open Research": "bg-primary/10 text-primary",
  Vision: "bg-accent/10 text-accent",
  Announcement: "bg-accent/10 text-accent",
  Standards: "bg-primary/8 text-primary/80 border border-primary/15",
};

const BlogIndexPage = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-16 md:pb-24">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            Blog
          </p>
          <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
            All Posts
          </h1>
          <p
            className="mt-10 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-4xl"
            style={{ animationDelay: "0.15s" }}
          >
            Essays, announcements, and research notes from the UOR community.
          </p>
        </div>
      </section>

      {/* All posts */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-golden-lg gap-y-golden-xl">
            {blogPosts.map((post, index) => (
              <Link
                key={post.href}
                to={post.href}
                className="highlight-card group animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="aspect-phi overflow-hidden">
                  <img
                    src={getBlogCover(post.coverKey)}
                    alt={post.title}
                    className="w-full h-full object-contain bg-card transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-fluid-caption font-medium font-body ${
                        tagStyles[post.tag] ?? "bg-primary/10 text-primary"
                      }`}
                    >
                      {post.tag}
                    </span>
                    <span className="text-fluid-caption text-foreground/70 font-body">
                      {post.date}
                    </span>
                  </div>
                  <h2 className="font-display text-fluid-card-title font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="text-fluid-body text-foreground/70 font-body leading-relaxed">
                    {post.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-auto pt-4 text-fluid-label font-medium text-foreground/45 group-hover:text-primary transition-colors duration-200 font-body">
                    Read more <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BlogIndexPage;