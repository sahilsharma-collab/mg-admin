import { ColumnDef } from "@tanstack/react-table";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Image from "next/image";

export interface IssueResponseColumn {
    id: number;
    title: string;
    description: string;
    imgUrl: string;
    userId: number;
    status: string;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
}

export interface IssueColumn {
    id: number;
    title: string;
    description: string;
    image: string;
    userName: string;
    userEmail: string;
    status: string;
    remarks: string | null;
    createdAt: string;
    updatedAt: string;
}

export const columns: ColumnDef<IssueColumn>[] = [
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="max-w-[15rem] truncate">
                            {row.original.description}
                        </div>
                    </TooltipTrigger>
                </Tooltip>
            </TooltipProvider>
        ),
    },
    {
        accessorKey: "image",
        header: "Screenshot",
        cell: ({ row }) => {
            const imgUrl = row.original.image;
            return (
                <div className="relative h-6 w-8 rounded-md overflow-hidden">
                    {imgUrl ? (
                        <Image
                            src={imgUrl || "/Images/no-image.png"}
                            alt={row.original.title || "Event image"}
                            fill
                            className="object-cover"
                            sizes="48px"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full w-full">
                            <span className="text-xs">N/A</span>
                        </div>
                    )}
                </div>
            );
        }
    },
    {
        accessorKey: "userName",
        header: "Reported By",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          let statusClass = "";
          
          switch (status) {
            case "PENDING":
              statusClass = "bg-yellow-100 text-yellow-800";
              break;
            case "RESOLVED":
              statusClass = "bg-green-100 text-green-800";
              break;
            case "REJECTED":
              statusClass = "bg-red-100 text-red-800";
              break;
            default:
              statusClass = "bg-gray-100 text-gray-800";
          }
          
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {status}
            </span>
          );
        }
      },
    {
        accessorKey: "remarks",
        header: "Remarks",
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="max-w-[15rem] truncate">
                            {row.original.remarks || "-"}
                        </div>
                    </TooltipTrigger>
                </Tooltip>
            </TooltipProvider>
        ),
    },
    // {
    //     accessorKey: "createdAt",
    //     header: "createdAt",
    // },
    {
        id: "actions",
        // cell: ({ row }) => <div className="flex justify-end">{row.original.id}</div>,
    },
];